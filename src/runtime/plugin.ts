import defu from 'defu'
import type { ScriptsContext, ScriptProviderDef } from './types'
import { defineNuxtPlugin, useMeta, useRouter, useRuntimeConfig } from '#imports'
// @ts-ignore
import _providers from '#build/script-providers.mjs'

export default defineNuxtPlugin((nuxtApp) => {
  // Initialize context
  const ctx: ScriptsContext = reactive({
    providers: [],
    options: {
      debug: true
    }
  })

  // Inject to app for composables
  nuxtApp._scriptsContext = ctx

  // Add configured providers
  type ProviderInfo = { name: string, provider: ScriptProviderDef<any>, options: any }
  const scriptsOptions = useRuntimeConfig().scripts || {}
  for (const _provider of _providers as ProviderInfo[]) {
    ctx.providers.push(_provider.provider({ ..._provider.options, ...scriptsOptions[_provider.name] }, ctx))
  }

  if (process.client) {
    // Router integration
    initRouterIntegration(ctx)
  }

  // Meta integration
  initMetaIntegration(ctx)
})

function initRouterIntegration (ctx: ScriptsContext) {
  const router = useRouter()
  router.afterEach(() => nextTick(() => {
    for (const provider of ctx.providers) {
      provider.onNavigation()
    }
  }))
}

function initMetaIntegration (ctx: ScriptsContext) {
  const metadata = computed(() => {
    const scripts = []
    for (const provider of ctx.providers) {
      const res = provider.render?.()
      scripts.push(...(res.scripts || []).map((s) => {
        if ('inlineScript' in s) {
          return { children: s.inlineScript }
        }
        if ('url' in s) {
          return { src: s.url }
        }
        return false
      }).filter(Boolean))
    }
    // Normalize to use with useMeta
    return {
      script: scripts
    }
  })
  useMeta(metadata)
}
