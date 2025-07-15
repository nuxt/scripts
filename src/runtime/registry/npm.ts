import { withBase } from 'ufo'
import { useRegistryScript } from '../utils'
import { object, optional, string, union, literal } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

const PROVIDERS = ['jsdelivr', 'cdnjs', 'unpkg'] as const
type Provider = (typeof PROVIDERS)[number]
const providerValidator = union(PROVIDERS.map(provider => literal(provider)))

export const NpmOptions = object({
  packageName: string(),
  file: optional(string()),
  version: optional(string()),
  provider: optional(providerValidator),
})

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
