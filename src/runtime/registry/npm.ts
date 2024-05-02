import { withBase } from 'ufo'
import { registryScript } from '../utils'
import { object, optional, string } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const NpmOptions = object({
  packageName: string(),
  file: optional(string()),
  version: optional(string()),
  type: optional(string()),
})

export type NpmInput = RegistryScriptInput<typeof NpmOptions>

export function useScriptNpm<T extends Record<string | symbol, any>>(_options: NpmInput) {
  // TODO support multiple providers? (e.g. jsdelivr, cdnjs, etc.) Only unpkg for now
  return registryScript<T, typeof NpmOptions>(`${_options.packageName}-npm`, options => ({
    scriptInput: {
      src: withBase(options.file || '', `https://unpkg.com/${options?.packageName}@${options.version || 'latest'}`),
    },
    schema: import.meta.dev ? NpmOptions : undefined,
  }), _options)
}
