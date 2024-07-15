import type { ExternalScript, Output, Script } from 'third-party-capital'
import { genImport, genTypeImport } from 'knitwork'
import { useNuxt } from '@nuxt/kit'
import type { HeadEntryOptions } from '@unhead/vue'
import { resolvePath } from 'mlly'

export interface BaseOpts {
  data: Output
  scriptFunctionName: string
  tpcTypeImport: string
  tpcKey: string
}
export interface ScriptContentOpts extends BaseOpts {
  /**
   * This will be stringified. The function must be pure.
   */
  use: () => any
  /**
   * This will be stringified. The function must be pure.
   */
  stub: (params: { fn: string }) => any
  featureDetectionName?: string
}

const HEAD_VAR = '__head'
const INJECTHEAD_CODE = `const ${HEAD_VAR} =  injectHead()`

export async function generateTpcTypes(input: BaseOpts) {
  const mainScript = input.data.scripts?.find(({ key }) => key === input.tpcKey) as ExternalScript

  if (!mainScript)
    throw new Error(`no main script found for ${input.tpcKey} in third-party-capital`)

  const imports = new Set<string>([
    'import type { RegistryScriptInput } from \'#nuxt-scripts\'',
    'import type { VueScriptInstance } from \'@unhead/vue\'',
  ])

  imports.add(genImport('#nuxt-scripts-validator', ['object', 'any']))

  const chunks: string[] = []

  if (input.tpcTypeImport) {
    // TPC type import
    imports.add(genTypeImport(await resolvePath('third-party-capital', {
      url: import.meta.url,
    }), [input.tpcTypeImport]))

    chunks.push(`
    declare global {
      interface Window extends ${input.tpcTypeImport} {}
    }`)
  }

  const hasParams = mainScript.params?.length

  if (hasParams) {
    imports.add(genTypeImport('#nuxt-scripts-validator', ['ObjectSchema', 'AnySchema']))
  }
  // need schema validation from tpc
  chunks.push(`export type Schema = ObjectSchema<{${mainScript.params?.map(p => `${p}:  AnySchema`)}}, undefined>`)
  chunks.push(`export type Input = RegistryScriptInput<Schema>`)
  chunks.push(`export function ${input.scriptFunctionName}<T extends ${input.tpcTypeImport}>(_options?: Input): T & {$script: Promise<T> & VueScriptInstance<T>;}`)

  return `
${Array.from(imports).join('\n')}
${chunks.join('\n')}
  `
}

export async function generateTpcContent(input: ScriptContentOpts) {
  const nuxt = useNuxt()
  if (!input.data.scripts)
    throw new Error('input.data has no scripts !')

  const mainScript = input.data.scripts?.find(({ key }) => key === input.tpcKey) as ExternalScript

  if (!mainScript)
    throw new Error(`no main script found for ${input.tpcKey} in third-party-capital`)

  const mainScriptOptions = getScriptInputOption(mainScript)

  const imports = new Set<string>([
    'import { withQuery } from \'ufo\'',
    'import { useRegistryScript } from \'#nuxt-scripts-utils\'',
    'import type { RegistryScriptInput } from \'#nuxt-scripts\'',
    'import type { VueScriptInstance } from \'@unhead/vue\'',
  ])

  const chunks: string[] = []
  const functionBody: string[] = []

  const hasParams = mainScript.params?.length

  if (input.tpcTypeImport) {
    // TPC type import
    imports.add(genTypeImport(await resolvePath('third-party-capital', {
      url: import.meta.url,
    }), [input.tpcTypeImport]))
  }

  if (hasParams) {
    imports.add(genImport('#nuxt-scripts-validator', ['object', 'any']))
    // need schema validation from tpc
    chunks.push(`const OptionSchema = object({${mainScript.params?.map(p => `${p}:  any()`)}})`)
  }

  chunks.push(`
declare global {
  interface Window extends ${input.tpcTypeImport} {}
}`)

  const clientInitCode: string[] = []

  if (input.data.stylesheets) {
    if (!functionBody.includes(INJECTHEAD_CODE)) {
      functionBody.unshift(INJECTHEAD_CODE)
    }
    functionBody.push(`${HEAD_VAR}.push({link: ${JSON.stringify(input.data.stylesheets.map(s => ({ ref: 'stylesheet', href: s })))}})`)
  }

  for (const script of input.data.scripts) {
    if ('code' in script)
      clientInitCode.push(replaceTokenToRuntime(script.code))

    if (script === mainScript)
      continue

    if ('url' in script) {
      functionBody.push(`${HEAD_VAR}.push({scripts:{ async: true, src: ${script.url} }},${JSON.stringify(getScriptInputOption(script))})`)
    }
  }

  chunks.push(`export type Input = RegistryScriptInput${hasParams ? '<typeof OptionSchema>' : ''}`)

  chunks.push(`
export function ${input.scriptFunctionName}<T extends ${input.tpcTypeImport}>(_options?: Input): T & {
  $script: Promise<T> & VueScriptInstance<T>;
} {
${functionBody.join('\n')}
  return useRegistryScript${hasParams ? '<T, typeof OptionSchema>' : ''}(_options?.key || '${input.tpcKey}', options => ({
        scriptInput: {
            src: withQuery('${mainScript.url}', {${mainScript.params?.map(p => `${p}: options?.${p}`)}})
        },
        ${nuxt.options.dev ? 'schema: OptionSchema,' : ''}
        scriptOptions: {
            use: ${input.use.toString()},
            stub: import.meta.client ? undefined :  ${input.stub.toString()},
            ${input.featureDetectionName ? `performanceMarkFeature: ${JSON.stringify(input.featureDetectionName)},` : ''}
            ${mainScriptOptions ? `...(${JSON.stringify(mainScriptOptions)})` : ''}
        },
        ${clientInitCode.length ? `clientInit: import.meta.server ? undefined : () => {${clientInitCode.join('\n')}},` : ''}
    }), _options)
}`)

  chunks.unshift(...Array.from(imports))
  return chunks.join('\n')
}

function replaceTokenToRuntime(code: string) {
  return code.split(';').map(c => c.replaceAll(/'?\{\{(.*?)\}\}'?/g, 'options.$1')).join(';')
}

function getScriptInputOption(script: Script): HeadEntryOptions | undefined {
  if (script.location === 'body') {
    if (script.action === 'append') {
      return { tagPosition: 'bodyClose' }
    }
    return { tagPosition: 'bodyOpen' }
  }

  if (script.action === 'append') {
    return { tagPriority: 1 }
  }
}
