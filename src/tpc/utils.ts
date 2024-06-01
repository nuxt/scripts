import type { ExternalScript, Output } from 'third-party-capital'
import { genImport } from 'knitwork'
import { useNuxt } from '@nuxt/kit'

interface Input {
  data: Output
  apiTypeImport: string
  augmentWindowTypes: boolean
  TpcKey: string
  scriptFunctionName: string
  // will be stringified
  use: () => any
  // will be stringified
  stub: (params: { fn: string }) => any
}

export function getTpcScriptContent(input: Input) {
  const nuxt = useNuxt()
  if (!input.data.scripts)
    throw new Error('input.data has no scripts !')

  const mainScript = input.data.scripts?.find(({ key }) => key === input.TpcKey) as ExternalScript

  if (!mainScript)
    throw new Error(`no main script found for ${input.TpcKey} in third-party-capital`)

  const imports = new Set<string>([
    'import { withQuery } from \'ufo\'',
    'import { useRegistryScript } from \'#nuxt-scripts\'',
    'import type { RegistryScriptInput } from \'#nuxt-scripts\'',
  ])

  const chunks: string[] = []

  const hasParams = mainScript.params?.length

  if (input.apiTypeImport) {
    // TPC type import
    imports.add(genImport('third-party-capital', [input.apiTypeImport]))
  }

  if (hasParams) {
    imports.add(genImport('#nuxt-scripts-validator', ['object', 'any']))
    // need schema validation from tpc
    chunks.push(`const OptionSchema = object({
            ${mainScript.params?.map(p => `${p}:  any()`)}
        })`)
  }

  if (input.augmentWindowTypes) {
    chunks.push(`
            declare global {
                interface Window extends ${input.apiTypeImport} {}
            }
        `)
  }

  const clientInitCode: string[] = []

  for (const script of input.data.scripts) {
    // todo handle <link>
    // todo handle additionnal scripts
    if ('code' in script)
      clientInitCode.push(script.code)
  }

  chunks.push(`export type Input = RegistryScriptInput${hasParams ? '<typeof OptionSchema>' : ''}`)

  chunks.push(`
export function ${input.scriptFunctionName}<T extends ${input.apiTypeImport}>(options?: Input) {
    return useRegistryScript${hasParams ? '<typeof OptionSchema>' : ''}('${input.TpcKey}', options => ({
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
    }), options)
}
    `)

  chunks.unshift(...Array.from(imports))
  return chunks.join('\n')
}
