import { object, optional, string } from 'valibot'
import { withBase } from 'ufo'
import { registryScript } from '../utils'
import type { RegistryScriptInput } from '#nuxt-scripts'

export const NpmOptions = object({
  packageName: string(),
  file: optional(string()),
  version: optional(string()),
  type: optional(string()),
})

export type NpmInput = RegistryScriptInput<typeof NpmOptions>

export function useScriptNpm<T extends Record<string | symbol, any>>(key: string, _options: NpmInput) {
  // TODO support multiple providers? (e.g. jsdelivr, cdnjs, etc.) Only unpkg for now
  return registryScript<T, typeof NpmOptions>(`${key}-npm`, options => ({
    scriptInput: {
      src: withBase(options.file || '', `https://unpkg.com/${options?.packageName}@${options.version || 'latest'}`),
    },
    schema: NpmOptions,
  }), _options)
}
