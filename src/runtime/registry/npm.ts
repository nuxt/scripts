import { withBase } from 'ufo'
import { useRegistryScript } from '../utils'
import { object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const NpmOptions = object({
  packageName: string(),
  file: optional(string()),
  version: optional(string()),
  type: optional(string()),
})

export type NpmInput = RegistryScriptInput<typeof NpmOptions, true, true, false>

export function useScriptNpm<T extends Record<string | symbol, any>>(_options: NpmInput) {
  // TODO support multiple providers? (e.g. jsdelivr, cdnjs, etc.) Only unpkg for now
  return useRegistryScript<T, typeof NpmOptions>(_options?.key || `${_options.packageName}-npm`, options => ({
    scriptInput: {
      src: withBase(options.file || '', `https://unpkg.com/${options?.packageName}@${options.version || 'latest'}`),
    },
    schema: import.meta.dev ? NpmOptions : undefined,
  }), _options)
}
