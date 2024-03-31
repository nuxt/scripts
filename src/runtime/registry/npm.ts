import { type Input, object, optional, string } from 'valibot'
import { withBase } from 'ufo'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptOptions } from '#nuxt-scripts'

export const NpmOptions = object({
  packageName: string(),
  file: optional(string()),
  version: optional(string()),
})

export function useScriptNpm<T>(options: Input<typeof NpmOptions>, _scriptOptions?: NuxtUseScriptOptions<T>) {
  const scriptOptions: NuxtUseScriptOptions<T> = _scriptOptions || {}
  scriptOptions.beforeInit = () => {
    validateScriptInputSchema(NpmOptions, options)
  }
  // TODO support multiple providers? (e.g. jsdelivr, cdnjs, etc.) Only unpkg for now
  return useScript<T>({
    src: typeof options === 'string' ? options : withBase(options.file || '', `https://unpkg.com/${options?.packageName}@${options.version}`),
  }, {
    ...scriptOptions,
    use() {
      return new window.JSConfetti()
    },
  })
}
