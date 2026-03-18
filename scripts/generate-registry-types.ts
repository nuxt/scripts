import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSync } from 'oxc-parser'
import { walk } from 'oxc-walker'

const registryDir = join(import.meta.dirname, '..', 'src', 'runtime', 'registry')
const componentsDir = join(import.meta.dirname, '..', 'src', 'runtime', 'components')
const outputPath = join(import.meta.dirname, '..', 'src', 'registry-types.json')

interface ExtractedDeclaration {
  name: string
  kind: 'interface' | 'type' | 'const'
  code: string
}

interface ExtractedProps {
  code: string
  defaults: Record<string, string>
}

// --- Helpers ---

function getName(node: any): string | null {
  if (node.type === 'TSInterfaceDeclaration' || node.type === 'TSTypeAliasDeclaration')
    return node.id.name
  if (node.type === 'VariableDeclaration' && node.declarations[0]?.id?.type === 'Identifier')
    return node.declarations[0].id.name
  return null
}

function getKind(node: any): ExtractedDeclaration['kind'] {
  if (node.type === 'TSInterfaceDeclaration')
    return 'interface'
  if (node.type === 'TSTypeAliasDeclaration')
    return 'type'
  return 'const'
}

// --- Schema field extraction (static AST-based) ---

interface SchemaFieldMeta {
  name: string
  type: string
  required: boolean
  description?: string
  defaultValue?: string
}

const JSDOC_START_RE = /^\s*\/\*\*/
const JSDOC_END_RE = /^\s*\*\//
const DOC_LINE_RE = /^\s*\*\s?(.*)/
const DEFAULT_TAG_RE = /^@default\s*/
const FIELD_MATCH_RE = /^\s*(\w+)\s*:/

function resolveAstType(node: any, source: string): string {
  if (!node)
    return 'unknown'
  if (node.type === 'CallExpression') {
    const callee = node.callee?.name
    if (callee === 'string')
      return 'string'
    if (callee === 'number')
      return 'number'
    if (callee === 'boolean')
      return 'boolean'
    if (callee === 'any')
      return 'any'
    if (callee === 'object')
      return 'object'
    if (callee === 'optional')
      return resolveAstType(node.arguments?.[0], source)
    if (callee === 'pipe')
      return resolveAstType(node.arguments?.[0], source)
    if (callee === 'array')
      return `${resolveAstType(node.arguments?.[0], source)}[]`
    if (callee === 'record')
      return `Record<${resolveAstType(node.arguments?.[0], source)}, ${resolveAstType(node.arguments?.[1], source)}>`
    if (callee === 'literal') {
      const arg = node.arguments?.[0]
      if (arg?.type === 'StringLiteral')
        return `'${arg.value}'`
      if (arg?.type === 'NumericLiteral')
        return String(arg.value)
      if (arg?.type === 'BooleanLiteral')
        return String(arg.value)
      return source.slice(arg?.start, arg?.end)
    }
    if (callee === 'union') {
      const arrArg = node.arguments?.[0]
      if (arrArg?.type === 'ArrayExpression') {
        return arrArg.elements.map((e: any) => resolveAstType(e, source)).join(' | ')
      }
      return 'unknown'
    }
    if (callee === 'custom')
      return 'Function'
  }
  return 'unknown'
}

function isOptionalCall(node: any): boolean {
  return node?.type === 'CallExpression' && node.callee?.name === 'optional'
}

function parseSchemaComments(code: string): Record<string, { description?: string, defaultValue?: string }> {
  const result: Record<string, { description?: string, defaultValue?: string }> = {}
  const lines = code.split('\n')
  let desc = ''
  let def = ''

  for (const line of lines) {
    if (JSDOC_START_RE.test(line)) {
      desc = ''
      def = ''
      continue
    }
    if (JSDOC_END_RE.test(line))
      continue

    const docLine = line.match(DOC_LINE_RE)
    if (docLine) {
      const content = docLine[1]!.trim()
      if (content.startsWith('@default'))
        def = content.replace(DEFAULT_TAG_RE, '')
      else if (!content.startsWith('@') && content)
        desc += (desc ? ' ' : '') + content
      continue
    }

    const fieldMatch = line.match(FIELD_MATCH_RE)
    if (fieldMatch) {
      if (desc || def)
        result[fieldMatch[1]!] = { description: desc || undefined, defaultValue: def || undefined }
      desc = ''
      def = ''
    }
  }

  return result
}

function extractSchemaFields(node: any, source: string, code: string): SchemaFieldMeta[] | null {
  // node is the init of the VariableDeclarator, should be CallExpression with callee "object"
  if (node?.type !== 'CallExpression' || node.callee?.name !== 'object')
    return null
  const objArg = node.arguments?.[0]
  if (objArg?.type !== 'ObjectExpression')
    return null

  const comments = parseSchemaComments(code)
  const fields: SchemaFieldMeta[] = []

  for (const prop of objArg.properties || []) {
    if (prop.type === 'SpreadElement')
      continue
    const key = prop.key?.name || prop.key?.value
    if (!key)
      continue

    const isOpt = isOptionalCall(prop.value)
    const typeNode = isOpt ? prop.value.arguments?.[0] : prop.value

    fields.push({
      name: key,
      type: resolveAstType(typeNode, source),
      required: !isOpt,
      description: comments[key]?.description,
      defaultValue: comments[key]?.defaultValue,
    })
  }

  return fields.length ? fields : null
}

// --- Registry type extraction ---

// Pre-parse schemas.ts to look up re-exported schema declarations
const schemasSource = readFileSync(join(registryDir, 'schemas.ts'), 'utf-8')
const schemaDeclarations = new Map<string, string>()
const schemaFields: Record<string, SchemaFieldMeta[]> = {}
{
  const { program } = parseSync('schemas.ts', schemasSource)
  for (const node of program.body) {
    if (node.type === 'ExportNamedDeclaration' && node.declaration?.type === 'VariableDeclaration') {
      const declarator = node.declaration.declarations[0]
      const name = declarator?.id?.name
      if (name) {
        schemaDeclarations.set(name, schemasSource.slice(node.start, node.end))
        // Extract field metadata for pre-computed schema fields
        if (!name.endsWith('Defaults')) {
          const fields = extractSchemaFields(declarator.init, schemasSource, schemasSource.slice(node.start, node.end))
          if (fields)
            schemaFields[name] = fields
        }
      }
    }
  }
}

function extractDeclarations(source: string, fileName: string): ExtractedDeclaration[] {
  const { program } = parseSync(fileName, source)
  const declarations: ExtractedDeclaration[] = []

  for (const node of program.body) {
    if (node.type === 'ImportDeclaration')
      continue
    if (node.type === 'TSModuleDeclaration')
      continue

    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      const decl = node.declaration
      if (decl.type === 'FunctionDeclaration')
        continue
      if (decl.type === 'TSTypeAliasDeclaration' && decl.id.name.endsWith('Input'))
        continue

      const name = getName(decl)
      if (!name)
        continue

      declarations.push({
        name,
        kind: getKind(decl),
        code: source.slice(node.start, node.end),
      })
    }
    // Handle re-exports like `export { XxxOptions } from './schemas'`
    else if (node.type === 'ExportNamedDeclaration' && !node.declaration && node.specifiers?.length) {
      for (const spec of node.specifiers) {
        const name = spec.exported?.name || spec.local?.name
        if (name && schemaDeclarations.has(name)) {
          declarations.push({
            name,
            kind: 'const',
            code: schemaDeclarations.get(name)!,
          })
        }
      }
    }
    else if (node.type === 'TSInterfaceDeclaration' || node.type === 'TSTypeAliasDeclaration') {
      const name = getName(node)
      if (!name || name.endsWith('Input'))
        continue

      declarations.push({
        name,
        kind: getKind(node),
        code: source.slice(node.start, node.end),
      })
    }
  }

  return declarations
}

// --- Component props extraction ---

const SCRIPT_SETUP_RE = /<script\s[^>]*\bsetup\b[^>]*>([\s\S]*?)<\/script>/

function extractScriptSetup(vueSource: string): string | null {
  // Match <script setup> or <script lang="ts" setup> — handles attribute order variations
  const match = vueSource.match(SCRIPT_SETUP_RE)
  return match?.[1] ?? null
}

function extractComponentProps(scriptSource: string, fileName: string): ExtractedProps | null {
  const { program } = parseSync(fileName, scriptSource)
  let result: ExtractedProps | null = null

  walk(program, {
    enter(node) {
      if (node.type !== 'CallExpression')
        return

      let definePropsCall: any = null
      let defaultsObj: any = null

      // withDefaults(defineProps<...>(), { ... })
      if (node.callee?.name === 'withDefaults' && node.arguments?.[0]?.callee?.name === 'defineProps') {
        definePropsCall = node.arguments[0]
        defaultsObj = node.arguments[1]
      }
      // defineProps<...>()
      else if (node.callee?.name === 'defineProps') {
        definePropsCall = node
      }

      if (!definePropsCall)
        return

      const typeArg = definePropsCall.typeArguments?.params?.[0]
      if (!typeArg)
        return

      const code = scriptSource.slice(typeArg.start, typeArg.end)

      // Extract defaults
      const defaults: Record<string, string> = {}
      if (defaultsObj?.type === 'ObjectExpression') {
        for (const prop of defaultsObj.properties || []) {
          if (prop.type === 'ObjectProperty' || prop.type === 'Property') {
            const key = prop.key?.name || prop.key?.value
            if (key) {
              defaults[key] = scriptSource.slice(prop.value.start, prop.value.end)
            }
          }
        }
      }

      result = { code, defaults }
      this.skip()
    },
  })

  return result
}

// --- Main ---

// 1. Generate registry-types.json
const registryFiles = readdirSync(registryDir).filter(f => f.endsWith('.ts') && f !== 'schemas.ts')
const types: Record<string, ExtractedDeclaration[]> = {}

for (const file of registryFiles) {
  const source = readFileSync(join(registryDir, file), 'utf-8')
  const declarations = extractDeclarations(source, file)
  if (declarations.length)
    types[file.replace('.ts', '')] = declarations
}

// 2. Extract component props and add to registry types
function findVueComponents(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push(...findVueComponents(join(dir, entry.name)))
    }
    else if (entry.name.endsWith('.vue') && entry.name.startsWith('Script')) {
      results.push(join(dir, entry.name))
    }
  }
  return results
}

const componentFiles = findVueComponents(componentsDir)
const componentProps: Record<string, ExtractedProps> = {}

for (const filePath of componentFiles) {
  const vueSource = readFileSync(filePath, 'utf-8')
  const scriptSetup = extractScriptSetup(vueSource)
  if (!scriptSetup)
    continue

  const fileName = filePath.split('/').pop()!
  const props = extractComponentProps(scriptSetup, fileName.replace('.vue', '.ts'))
  if (props) {
    componentProps[fileName.replace('.vue', '')] = props
  }
}

// Map component names to doc slugs
// Components that share a doc page with a registry script
const componentToSlug: Record<string, string> = {
  ScriptYouTubePlayer: 'youtube-player',
  ScriptVimeoPlayer: 'vimeo-player',
  ScriptGoogleMaps: 'google-maps',
  ScriptGoogleMapsMarker: 'google-maps',
  ScriptGoogleMapsAdvancedMarkerElement: 'google-maps',
  ScriptGoogleMapsCircle: 'google-maps',
  ScriptGoogleMapsHeatmapLayer: 'google-maps',
  ScriptGoogleMapsInfoWindow: 'google-maps',
  ScriptGoogleMapsMarkerClusterer: 'google-maps',
  ScriptGoogleMapsPinElement: 'google-maps',
  ScriptGoogleMapsPolygon: 'google-maps',
  ScriptGoogleMapsPolyline: 'google-maps',
  ScriptGoogleMapsRectangle: 'google-maps',
  ScriptCarbonAds: 'carbon-ads',
  ScriptCrisp: 'crisp',
  ScriptIntercom: 'intercom',
  ScriptGoogleAdsense: 'google-adsense',
  ScriptBlueskyEmbed: 'bluesky-embed',
  ScriptInstagramEmbed: 'instagram-embed',
  ScriptXEmbed: 'x-embed',
  ScriptLemonSqueezy: 'lemon-squeezy',
  ScriptStripePricingTable: 'stripe',
  ScriptPayPalButtons: 'paypal',
  ScriptPayPalMessages: 'paypal',
}

// Add component props as declarations to the types JSON
for (const [componentName, props] of Object.entries(componentProps)) {
  // Skip non-public components (loading indicator, aria indicator, etc.)
  const slug = componentToSlug[componentName]
  if (!slug)
    continue

  if (!types[slug])
    types[slug] = []

  const propsInterface = `interface ${componentName}Props ${props.code}`
  types[slug].push({
    name: `${componentName}Props`,
    kind: 'interface',
    code: propsInterface,
  })

  if (Object.keys(props.defaults).length) {
    const defaultsCode = `const ${componentName}Defaults = ${JSON.stringify(props.defaults, null, 2)}`
    types[slug].push({
      name: `${componentName}Defaults`,
      kind: 'const',
      code: defaultsCode,
    })
  }
}

const output = {
  types,
  schemaFields,
}

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
console.log(`Generated registry types for ${Object.keys(types).length} scripts (${Object.keys(componentProps).length} with component props, ${Object.keys(schemaFields).length} schema fields)`)
