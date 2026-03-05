import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSync } from 'oxc-parser'
import { walk } from 'oxc-walker'

const registryDir = join(import.meta.dirname, '..', 'src', 'runtime', 'registry')
const componentsDir = join(import.meta.dirname, '..', 'src', 'runtime', 'components')
const outputPath = join(import.meta.dirname, '..', 'src', 'registry-types.json')
const schemasOutputPath = join(import.meta.dirname, '..', 'src', 'registry-schemas.ts')

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

// --- Registry type extraction ---

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

// --- Schema extraction ---

function extractSchemas(source: string, fileName: string): { schemas: string[], localDeps: string[], valibotImports: Set<string> } {
  const { program } = parseSync(fileName, source)
  const schemas: string[] = []
  const allLocalDeps: { name: string, code: string }[] = []
  const valibotImports = new Set<string>()

  for (const node of program.body) {
    if (node.type === 'ImportDeclaration' && source.slice(node.source.start, node.source.end).includes('nuxt-scripts-validator')) {
      for (const spec of node.specifiers || []) {
        if (spec.type === 'ImportSpecifier')
          valibotImports.add(spec.imported?.name || spec.local.name)
      }
    }
  }

  for (const node of program.body) {
    if (node.type === 'ImportDeclaration' || node.type === 'TSModuleDeclaration')
      continue

    if (node.type === 'ExportNamedDeclaration' && node.declaration) {
      const decl = node.declaration
      if (decl.type === 'FunctionDeclaration')
        continue
      if (decl.type === 'TSTypeAliasDeclaration')
        continue
      if (decl.type === 'VariableDeclaration') {
        schemas.push(source.slice(node.start, node.end))
      }
    }
    else if (node.type === 'VariableDeclaration') {
      const name = node.declarations[0]?.id?.name
      if (name)
        allLocalDeps.push({ name, code: source.slice(node.start, node.end) })
    }
  }

  // Only include local deps actually referenced by schemas (with transitive resolution)
  const referenced = new Set<string>()
  const allCode = schemas.join('\n')
  for (const dep of allLocalDeps) {
    if (allCode.includes(dep.name))
      referenced.add(dep.name)
  }
  // Resolve transitive deps
  let changed = true
  while (changed) {
    changed = false
    for (const dep of allLocalDeps) {
      if (referenced.has(dep.name))
        continue
      for (const ref of referenced) {
        const refDep = allLocalDeps.find(d => d.name === ref)
        if (refDep && refDep.code.includes(dep.name)) {
          referenced.add(dep.name)
          changed = true
        }
      }
    }
  }

  const localDeps = allLocalDeps.filter(d => referenced.has(d.name)).map(d => d.code)
  return { schemas, localDeps, valibotImports }
}

// --- Component props extraction ---

function extractScriptSetup(vueSource: string): string | null {
  // Match <script setup> or <script lang="ts" setup> — handles attribute order variations
  const match = vueSource.match(/<script\s[^>]*\bsetup\b[^>]*>([\s\S]*?)<\/script>/)
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
const registryFiles = readdirSync(registryDir).filter(f => f.endsWith('.ts'))
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
  ScriptInstagramEmbed: 'instagram-embed',
  ScriptXEmbed: 'x-embed',
  ScriptLemonSqueezy: 'lemon-squeezy',
  ScriptStripePricingTable: 'stripe',
  ScriptPayPalButtons: 'paypal',
  ScriptPayPalMarks: 'paypal',
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

writeFileSync(outputPath, JSON.stringify(types, null, 2))
console.log(`Generated registry types for ${Object.keys(types).length} scripts (${Object.keys(componentProps).length} with component props)`)

// 3. Generate registry-schemas.ts
const allValibotImports = new Set<string>()
const schemaBlocks: string[] = []

for (const file of registryFiles) {
  const source = readFileSync(join(registryDir, file), 'utf-8')
  const { schemas, localDeps, valibotImports } = extractSchemas(source, file)
  if (!schemas.length)
    continue

  for (const name of valibotImports)
    allValibotImports.add(name)

  const slug = file.replace('.ts', '')
  const block = [`// ${slug}`]
  if (localDeps.length)
    block.push(...localDeps)
  block.push(...schemas)
  schemaBlocks.push(block.join('\n'))
}

allValibotImports.delete('InferInput')

const schemasFile = [
  `// Generated by scripts/generate-registry-types.ts — DO NOT EDIT`,
  `import { ${[...allValibotImports].sort().join(', ')} } from 'valibot'`,
  ``,
  ...schemaBlocks.map(b => `${b}\n`),
].join('\n')

writeFileSync(schemasOutputPath, schemasFile)
console.log(`Generated registry-schemas.ts with ${schemaBlocks.length} schema blocks`)
