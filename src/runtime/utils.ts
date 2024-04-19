import type { BaseSchema } from 'valibot'
import { useScript, validateScriptInputSchema } from '#imports'
import type { NuxtUseScriptIntegrationOptions } from '#nuxt-scripts'

export function mockFallbackScript(name: string, module: string) {
  console.error(`${name} is provided by ${module}. Check your console to install it or run 'npx nuxi@latest module add ${module}'`)
  return useScript('', { trigger: 'manual' })
}

export function registryScriptOptions(config: { schema?: BaseSchema<any>, options?: any, scriptOptions?: NuxtUseScriptIntegrationOptions, clientInit?: () => void }) {
  const scriptOptions: NuxtUseScriptIntegrationOptions = config.scriptOptions || {}
  const init = config.scriptOptions?.beforeInit
  scriptOptions.beforeInit = () => {
    // validate input in dev
    import.meta.dev && config.schema && validateScriptInputSchema(config.schema, config.options)
    // avoid clearing the user beforeInit
    init && init()
    import.meta.client && config.clientInit?.()
  }
  return scriptOptions
}
