import type { BaseSchema } from 'valibot'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptIntegrationOptions, RegistryScriptInput } from '#nuxt-scripts'

export function mockFallbackScript(name: string, module: string) {
  console.error(`${name} is provided by ${module}. Check your console to install it or run 'npx nuxi@latest module add ${module}'`)
  return useScript('', { trigger: 'manual' })
}

export function registryScriptOptions(config: { schema?: BaseSchema<any>, options?: RegistryScriptInput<any>, clientInit?: () => void }) {
  const scriptOptions: NuxtUseScriptIntegrationOptions = config.options.scriptOptions || {}
  const init = config.options.scriptOptions?.beforeInit
  scriptOptions.beforeInit = () => {
    // validate input in dev
    import.meta.dev && config.schema && validateScriptInputSchema(config.schema, config.options)
    // avoid clearing the user beforeInit
    init && init()
    import.meta.client && config.clientInit?.()
  }
  return scriptOptions
}
