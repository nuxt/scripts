import type { ExternalScript, Script } from 'third-party-capital'
import { genImport } from 'knitwork'
import type { HeadEntryOptions } from '@unhead/vue'
import type { TpcDescriptor } from './generateTpcScripts'

const HEAD_VAR = '__head'
const INJECTHEAD_CODE = `const ${HEAD_VAR} =  injectHead()`

export async function generateTpcContent(input: TpcDescriptor) {
  if (!input.tpcData.scripts)
    throw new Error('input.data has no scripts !')

  // replace all empty spaces with nothing
  const titleKey = input.label.replace(/\s/g, '')

  const mainScript = input.tpcData.scripts?.find(({ key }) => key === input.tpcKey) as ExternalScript

  if (!mainScript)
    throw new Error(`no main script found for ${input.tpcKey} in third-party-capital`)

  const mainScriptOptions = getScriptInputOption(mainScript)

  const imports = new Set<string>([
    'import { withQuery } from \'ufo\'',
    'import { useRegistryScript } from \'#nuxt-scripts-utils\'',
    'import type { RegistryScriptInput } from \'#nuxt-scripts\'',
  ])
  const tpcTypes = new Set<string>()

  const chunks: string[] = []
  const functionBody: string[] = []

  if (input.tpcTypeAugmentation) {
    tpcTypes.add(input.tpcTypeAugmentation)

    chunks.push(`
    declare global {
      interface Window extends ${input.tpcTypeAugmentation} {}
    }`)
  }
  else {
    chunks.push(`
    declare global {
      interface Window {
        [key: string]: any
      }
    }`)
  }

  if (input.tpcTypesImport) {
    for (const typeImport of input.tpcTypesImport) {
      tpcTypes.add(typeImport)
    }
  }

  if (tpcTypes.size) {
    imports.add(genImport('third-party-capital', [...tpcTypes]))
  }

  if (input.defaultOptions) {
    imports.add(genImport('defu', ['defu']))
    functionBody.push(`_options = defu(_options, ${JSON.stringify(input.defaultOptions)})`)
  }

  const params = [...new Set(input.tpcData.scripts?.map(s => s.params || []).flat() || [])]

  if (params.length) {
    const validatorImports = new Set<string>(['object', 'string'])
    // need schema validation from tpc
    chunks.push(`export const ${titleKey}Options = object({${params.map((p) => {
      if (input.defaultOptions && p in input.defaultOptions) {
        validatorImports.add('optional')
        return `${p}: optional(string())`
      }
      return `${p}: string()`
    })}})`)
    imports.add(genImport('#nuxt-scripts-validator', [...validatorImports]))
  }

  const clientInitCode: string[] = []

  if (input.tpcData.stylesheets) {
    if (!functionBody.includes(INJECTHEAD_CODE)) {
      functionBody.unshift(INJECTHEAD_CODE)
    }
    functionBody.push(`${HEAD_VAR}.push({link: ${JSON.stringify(input.tpcData.stylesheets.map(s => ({ ref: 'stylesheet', href: s })))}})`)
  }

  for (const script of input.tpcData.scripts) {
    if ('code' in script)
      clientInitCode.push(replaceTokenToRuntime(script.code))

    if (script === mainScript)
      continue

    if ('url' in script) {
      functionBody.push(`${HEAD_VAR}.push({scripts:{ async: true, src: ${script.url} }},${JSON.stringify(getScriptInputOption(script))})`)
    }
  }

  chunks.push(`export type ${titleKey}Input = RegistryScriptInput${params.length ? `<typeof ${titleKey}Options>` : ''}`)

  if (input.returnUse) {
    chunks.push(`
function use(options: ${titleKey}Input) { 
  return ${input.returnUse} 
}
    `)
  }

  chunks.push(`
export function ${input.registry.import!.name}(_options?: ${titleKey}Input) {
${functionBody.join('\n')}
  return useRegistryScript<${input.returnUse ? `ReturnType<typeof use>` : `Record<string | symbol, any>`},${params.length ? `typeof ${titleKey}Options` : ''}>(_options?.key || '${input.key}', options => ({
        scriptInput: {
            src: withQuery('${mainScript.url}', {${mainScript.params?.map(p => `${p}: options?.${p}`)}})
        },
        schema: import.meta.dev ? undefined : ${titleKey}Options,
        scriptOptions: {
            ${input.returnUse ? `use: () => use(options),` : ''}
            stub: import.meta.client ? undefined : ({fn}) => { return ${input.returnStub}},
            ${input.performanceMarkFeature ? `performanceMarkFeature: ${JSON.stringify(input.performanceMarkFeature)},` : ''}
            ${mainScriptOptions ? `...(${JSON.stringify(mainScriptOptions)})` : ''}
        },
        // eslint-disable-next-line
        ${clientInitCode.length ? `clientInit: import.meta.server ? undefined : () => {${clientInitCode.join('\n')}},` : ''}
    }), _options)
}`)

  chunks.unshift(...Array.from(imports))
  chunks.unshift('// WARNING: This file is automatically generated, do not manually modify.')
  return chunks.join('\n')
}

function replaceTokenToRuntime(code: string) {
  return code.split(';').map(c => c.replaceAll(/'?\{\{(.*?)\}\}'?/g, 'options.$1!')).join(';')
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
