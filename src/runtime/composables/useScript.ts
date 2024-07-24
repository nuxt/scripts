import type { UseScriptInput, VueScriptInstance } from '@unhead/vue'
import type { UseScriptOptions } from '@unhead/schema'
import { hashCode } from '@unhead/shared'
import { defu } from 'defu'
import { useScript as _useScript } from '@unhead/vue'
import { injectHead, onNuxtReady, useNuxtApp, useRuntimeConfig, reactive } from '#imports'
import type { NuxtDevToolsScriptInstance, NuxtUseScriptOptions } from '#nuxt-scripts'

function useNuxtScriptRuntimeConfig() {
  return useRuntimeConfig().public['nuxt-scripts'] as {
    defaultScriptOptions: NuxtUseScriptOptions
  }
}

export function useScript<T extends Record<string | symbol, any>>(input: UseScriptInput, options?: NuxtUseScriptOptions): T & { $script: Promise<T> & VueScriptInstance<T> } {
  input = typeof input === 'string' ? { src: input } : input
  options = defu(options, useNuxtScriptRuntimeConfig()?.defaultScriptOptions)

  if (options.trigger === 'onNuxtReady')
    options.trigger = onNuxtReady
  const nuxtApp = useNuxtApp()
  const id = (input.key || input.src || hashCode((typeof input.innerHTML === 'string' ? input.innerHTML : ''))) as keyof typeof nuxtApp._scripts
  nuxtApp.$scripts = nuxtApp.$scripts! || reactive({})
  // return early
  if ((nuxtApp.$scripts as Record<string, any>)[id]) {
    return (nuxtApp.$scripts as Record<string, any>)[id]
  }
  if (import.meta.client) {
    // only validate if we're initializing the script
    if (!nuxtApp._scripts?.[id]) {
      performance?.mark?.('mark_feature_usage', {
        detail: {
          feature: options.performanceMarkFeature ?? `nuxt-scripts:${id}`,
        },
      })
    }
  }
  const instance = _useScript<T>(input, options as any as UseScriptOptions<T>)
  // @ts-expect-error untyped
  nuxtApp.$scripts[id] = instance
  // used for devtools integration
  if (import.meta.dev && import.meta.client) {
    // sync scripts to nuxtApp with debug details
    const payload: NuxtDevToolsScriptInstance = {
      ...options.devtools,
      src: input.src,
      $script: null as any as VueScriptInstance<T>,
      events: [],
    }
    nuxtApp._scripts = nuxtApp._scripts! || {}

    function syncScripts() {
      nuxtApp._scripts[instance.$script.id] = payload
      nuxtApp.hooks.callHook('scripts:updated', { scripts: nuxtApp._scripts as any as Record<string, NuxtDevToolsScriptInstance> })
    }

    if (!nuxtApp._scripts[instance.$script.id]) {
      const head = injectHead()
      head.hooks.hook('script:updated', (ctx) => {
        if (ctx.script.id !== instance.$script.id)
          return
        // convert the status to a timestamp
        payload.events.push({
          type: 'status',
          status: ctx.script.status,
          at: Date.now(),
        })
        payload.$script = instance.$script
        syncScripts()
      })
      head.hooks.hook('script:instance-fn', (ctx) => {
        if (ctx.script.id !== instance.$script.id || String(ctx.fn).startsWith('__v_'))
          return
        // log all events
        payload.events.push({
          type: 'fn-call',
          fn: ctx.fn,
          at: Date.now(),
        })
        syncScripts()
      })
      payload.$script = instance.$script
      payload.events.push({
        type: 'status',
        status: 'awaitingLoad',
        trigger: options?.trigger,
        at: Date.now(),
      })
      syncScripts()
    }
  }
  return instance
}
