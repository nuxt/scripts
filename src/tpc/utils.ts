import type { ExternalScript, Output } from 'third-party-capital'
import { genImport, genTypeImport } from 'knitwork'
import { useNuxt } from '@nuxt/kit'
import type { Link, Script } from '@unhead/vue'

interface Input {
  data: Output
  scriptFunctionName: string
  tpcTypeImport: string
  augmentWindowTypes?: boolean
  tpcKey: string
  /**
   * This will be stringified. The function must be pure.
   */
  use: () => any
  /**
   * This will be stringified. The function must be pure.
   */
  stub: (params: { fn: string }) => any
}

export function getTpcScriptContent(input: Input) {
  const nuxt = useNuxt()
  if (!input.data.scripts)
    throw new Error('input.data has no scripts !')

  const mainScript = input.data.scripts?.find(({ key }) => key === input.tpcKey) as ExternalScript

  if (!mainScript)
    throw new Error(`no main script found for ${input.tpcKey} in third-party-capital`)

  const imports = new Set<string>([
    'import { withQuery } from \'ufo\'',
    'import { useRegistryScript } from \'#imports\'',
    'import type { RegistryScriptInput } from \'#nuxt-scripts\'',
  ])

  const chunks: string[] = []
  const functionBody: string[] = []

  const hasParams = mainScript.params?.length

  if (input.tpcTypeImport) {
    // TPC type import
    imports.add(genTypeImport('third-party-capital', [input.tpcTypeImport]))
  }

  if (hasParams) {
    imports.add(genImport('#nuxt-scripts-validator', ['object', 'any']))
    // need schema validation from tpc
    chunks.push(`const OptionSchema = object({${mainScript.params?.map(p => `${p}:  any()`)}})`)
  }

  if (input.augmentWindowTypes) {
    chunks.push(`
declare global {
  interface Window extends ${input.tpcTypeImport} {}
}`)
  }

  const clientInitCode: string[] = []
  const runtimeHead: { script: Script[], link: Link[] } = {
    script: [],
    link: input.data.stylesheets?.map(s => ({ ref: 'stylesheet', href: s })) || [],
  }

  if (input.data.stylesheets) {
    runtimeHead.link.push(...input.data.stylesheets.map(s => ({ href: s, ref: 'stylesheet' })))
  }

  for (const script of input.data.scripts) {
    if ('code' in script)
      clientInitCode.push(replaceTokenToRuntime(script.code))

    if (script === mainScript)
      continue

    if ('url' in script && script.url) {
      if (!runtimeHead.script)
        runtimeHead.script = []

      runtimeHead.script.push({
        src: script.url,
        async: true,
      })
    }
  }

  if (runtimeHead.script.length || runtimeHead.link.length) {
    functionBody.push(`useHead(${JSON.stringify(runtimeHead)})`)
  }

  chunks.push(`export type Input = RegistryScriptInput${hasParams ? '<typeof OptionSchema>' : ''}`)

  chunks.push(`
export function ${input.scriptFunctionName}<T extends ${input.tpcTypeImport}>(_options?: Input) {
${functionBody.join('\n')}
  return useRegistryScript${hasParams ? '<T, typeof OptionSchema>' : ''}('${input.tpcKey}', options => ({
        scriptInput: {
            async: true,
            src: withQuery('${mainScript.url}', {${mainScript.params?.map(p => `${p}: options?.${p}`)}})
        },
        ${nuxt.options.dev ? 'schema: OptionSchema,' : ''}
        scriptOptions: {
            use: ${input.use.toString()},
            stub: import.meta.client ? undefined :  ${input.stub.toString()}
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
