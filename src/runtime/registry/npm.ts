import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { withBase } from 'ufo'
import { useRegistryScript } from '../utils'
import { NpmOptions } from './schemas'

export { NpmOptions }

type Provider = 'jsdelivr' | 'cdnjs' | 'unpkg'

export type NpmInput = RegistryScriptInput<typeof NpmOptions, true, true, false>

export function useScriptNpm<T extends Record<string | symbol, any>>(_options: NpmInput) {
  return useRegistryScript<T, typeof NpmOptions>(`${_options.packageName}-npm`, (options) => {
    const baseUrl = getProviderBaseUrl(options.provider, options.packageName, options.version)
    return {
      scriptInput: {
        src: withBase(options.file || '', baseUrl),
      },
      schema: import.meta.dev ? NpmOptions : undefined,
    }
  }, _options)
}

function getProviderBaseUrl(provider: Provider = 'unpkg', packageName: string, version: string = 'latest'): string {
  switch (provider) {
    case 'jsdelivr':
      return `https://cdn.jsdelivr.net/npm/${packageName}@${version}/`
    case 'cdnjs':
      return `https://cdnjs.cloudflare.com/ajax/libs/${packageName}/${version}/`
    case 'unpkg':
    default:
      return `https://unpkg.com/${packageName}@${version}/`
  }
}
