import type { ExternalScript, Output } from 'third-party-capital'
import { genImport } from 'knitwork'
import { useNuxt } from '@nuxt/kit'
import { type Link, type ReactiveHead, type Script, type UseHeadInput, useHead } from '@unhead/vue'

interface Input {
  data: Output
  tpcTypeImport: string
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
    'import { useRegistryScript } from \'#imports\'',
    'import type { RegistryScriptInput } from \'#nuxt-scripts\'',
  ])

  const chunks: string[] = []
  const functionBodyPrepend: string[] = []

  const hasParams = mainScript.params?.length

  if (input.tpcTypeImport) {
    // TPC type import
    imports.add(genImport('third-party-capital', [input.tpcTypeImport]))
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
                interface Window extends ${input.tpcTypeImport} {}
            }
        `)
  }

  const clientInitCode: string[] = []
  const runtimeHead: { script: Script[], link: Link[] } = {
    script: [],
    link: input.data.stylesheets?.map(s => ({ ref: 'stylesheet', href: s })) || [],
  }
  if (input.data.stylesheets) {
    clientInitCode.push(`useHead(${JSON.stringify(input.data.stylesheets.map(s => `{ref: 'stylesheet', href: ${s}}`))})`)
  }

  for (const script of input.data.scripts) {
    // todo handle additionnal scripts
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

  for (const script of input.data.scripts) {
    // todo handle additionnal scripts
    if ('code' in script)
      clientInitCode.push(clearUnreplacedCode(script.code))
  }

  if (runtimeHead.script.length || runtimeHead.link.length) {
    functionBodyPrepend.push(`useHead(${JSON.stringify(runtimeHead)})`)
  }

  chunks.push(`export type Input = RegistryScriptInput${hasParams ? '<typeof OptionSchema>' : ''}`)

  chunks.push(`
export function ${input.scriptFunctionName}<T extends ${input.tpcTypeImport}>(options?: Input) {
  ${functionBodyPrepend.join('\n')}
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

function clearUnreplacedCode(code: string) {
  // todo handle it in runtime code ?
  return code.split(';').filter(c => !c.match(/\{\{(.*?)\}\}/g)).join(';')
}

interface EmbedInput {
  data: Output
  componentName: string
}
// for youtube embed
function getEmbedComponentContent(input: EmbedInput) {
  const imports = new Set<string>([genImport('vue', ['defineComponent'])])

  const setup: string[] = []

  return `
${Array.from(imports).join('\n')}  
export default defineComponent({
  name: ${input.componentName},
  setup() {
    ${setup.join('\n')}
  }
})
`
}
