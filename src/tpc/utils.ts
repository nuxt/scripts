import type { ExternalScript, Output, Data, Script as TpcScript } from 'third-party-capital'
import { genImport, genTypeImport } from 'knitwork'
import { useNuxt } from '@nuxt/kit'
import type { HeadEntryOptions, Link, Script } from '@unhead/vue'

const HEAD_VAR = '__head'
const INJECTHEAD_CODE = `const ${HEAD_VAR} = injectHead()`

export interface ScriptOpts {
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

export function getTpcScriptContent(input: ScriptOpts) {
  const nuxt = useNuxt()
  if (!input.data.scripts)
    throw new Error('input.data has no scripts !')

  const mainScript = input.data.scripts?.find(({ key }) => key === input.tpcKey) as ExternalScript

  if (!mainScript)
    throw new Error(`no main script found for ${input.tpcKey} in third-party-capital`)

  const imports = new Set<string>([
    'import { withQuery } from \'ufo\'',
    'import { useRegistryScript } from \'#nuxt-scripts-utils\'',
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



export function getTpcEmbedComponent(input: Data) {
  if(!input.html) {
    throw new Error(`[@nuxt/scripts]: ${input.id} should have an html property.`)
  }
  const imports: Set<string> = new Set([
    genImport('vue', ['defineComponent', 'h', 'mergeProps'])
  ])


  const props = []
  const setupChunks: string[]= []
  let src: string | undefined

  const { attributes } = input.html  
  if (attributes.src) {
    imports.add(genImport('pathe', ['join']))
    imports.add(genImport('ufo', ['withQuery']))

    if(attributes.src.params) {
      props.push(...attributes.src.params)
    }
    src = `withQuery('${attributes.src.url}', mergeProps(getPropertiesFromObject(props, ${JSON.stringify(attributes.src.params)}), {key: props.apiKey}))`
  }

  if (input.scripts) {
    imports.add(genImport('@unhead/vue', ['injectHead']))
    if (!setupChunks.includes(INJECTHEAD_CODE)) {
      setupChunks.unshift(INJECTHEAD_CODE)
    }
    
    for(const script of input.scripts) {
      if('url' in script) {
        setupChunks.push(`${HEAD_VAR}.push({
          script: [{ async: true, src: '${script.url}' }]
        },${JSON.stringify(getScriptInputOption(script))})`)
      }

      // todo handle CodeBlock
    }
  }

  if(input.stylesheets) {
    imports.add(genImport('@unhead/vue', ['injectHead']))
    if (!setupChunks.includes(INJECTHEAD_CODE)) {
      setupChunks.unshift(INJECTHEAD_CODE)
    }
    setupChunks.push(`${HEAD_VAR}.push({
      link: ${JSON.stringify(input.stylesheets.map(s => ({ rel: 'stylesheet', href: s })))}
    })`)
  }

  for(const attr in attributes) {
    if(attributes[attr] === null) {
      // null values should be defined by the user
      props.push(attr)
    }
  }

  return `
${Array.from(imports).join('\n')}
function getPropertiesFromObject(obj: Record<string, any>, properties: string[]): Record<string, any> {
  return properties.reduce<Record<string, any>>((acc, property) => {
      if (obj[property] !== undefined) {
          acc[property] = obj[property];
      }
      return acc;
  }
  , {});
}
export default defineComponent({
  name: "${input.id}",
  props: ${JSON.stringify(props.map(p => p === 'key' ? 'apiKey' : p))},
  setup(props) {
    ${setupChunks.join('\n')}
    return () => h('${input.html.element}', mergeProps(${JSON.stringify(attributes)}, getPropertiesFromObject(props, ${JSON.stringify(Object.keys(attributes))}), {
      ${src ? `src: ${src}` : ''}
    }))
  }
})
  `
}

function getScriptInputOption(script: TpcScript): HeadEntryOptions | undefined {
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