import type { ScriptProvider, ScriptProviderDef } from './types'
import { useNuxtApp, useRuntimeConfig } from '#imports'

export const addScriptsProvider = (name: string, provider: ScriptProvider | ScriptProviderDef, options?: Record<string, any>) => {
  const nuxtApp = useNuxtApp()
  const scriptsOptions = useRuntimeConfig().scripts || {}
  nuxtApp._scriptsContext.providers.push(
    provider instanceof Function
      ? provider({ ...options, ...scriptsOptions[name] }, nuxtApp._scriptsContext)
      : provider
  )
}

export const addScript = ()
