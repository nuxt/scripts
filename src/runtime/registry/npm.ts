import { object, optional, string } from 'valibot'
import { withBase } from 'ufo'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptOptions, ScriptDynamicSrcInput } from '#nuxt-scripts'

export const NpmOptions = object({
  packageName: string(),
  file: optional(string()),
  version: optional(string()),
})

export type NpmInput = ScriptDynamicSrcInput<typeof NpmOptions>

export function useScriptNpm<T>(options: NpmInput, _scriptOptions?: NuxtUseScriptOptions<T>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    import.meta.dev && validateScriptInputSchema(NpmOptions, options)
  }
  // TODO support multiple providers? (e.g. jsdelivr, cdnjs, etc.) Only unpkg for now
  return useScript<T>({
    key: options.packageName,
    src: options.src || withBase(options.file || '', `https://unpkg.com/${options?.packageName}@${options.version || 'latest'}`),
  }, scriptOptions)
}
