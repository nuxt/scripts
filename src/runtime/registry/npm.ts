import { object, optional, string } from 'valibot'
import { withBase } from 'ufo'
import { registryScriptOptions } from '../utils'
import { useScript } from '#imports'
import type { NuxtUseScriptOptions, ScriptDynamicSrcInput } from '#nuxt-scripts'

export const NpmOptions = object({
  packageName: string(),
  file: optional(string()),
  version: optional(string()),
  type: optional(string()),
})

export type NpmInput = ScriptDynamicSrcInput<typeof NpmOptions>

export function useScriptNpm<T>(options: NpmInput, scriptOptions?: NuxtUseScriptOptions<T>) {
  // TODO support multiple providers? (e.g. jsdelivr, cdnjs, etc.) Only unpkg for now
  return useScript<T>({
    type: options.type,
    key: options.packageName,
    src: options.src || withBase(options.file || '', `https://unpkg.com/${options?.packageName}@${options.version || 'latest'}`),
  }, registryScriptOptions({
    scriptOptions,
    schema: NpmOptions,
    options,
  }))
}
