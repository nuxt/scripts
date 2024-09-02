import type { UseScriptInput, VueScriptInstance } from '@unhead/vue'
import type { UseScriptOptions, UseFunctionType, AsAsyncFunctionValues } from '@unhead/schema'
import { resolveScriptKey } from 'unhead'
import { defu } from 'defu'
import { useScript as _useScript } from '@unhead/vue'
import { injectHead, onNuxtReady, useNuxtApp, useRuntimeConfig, reactive } from '#imports'
import type { NuxtDevToolsScriptInstance, NuxtUseScriptOptions } from '#nuxt-scripts'

function useNuxtScriptRuntimeConfig() {
  return useRuntimeConfig().public['nuxt-scripts'] as {
    defaultScriptOptions: NuxtUseScriptOptions
  }
}

export type UseScriptContext<T extends Record<symbol | string, any>> =
  (Promise<T> & VueScriptInstance<T>)
  & AsAsyncFunctionValues<T>
  & {
  /**
   * @deprecated Use top-level functions instead.
   */
    $script: Promise<T> & VueScriptInstance<T>
  }

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>, U = Record<symbol | string, any>>(input: UseScriptInput, options?: NuxtUseScriptOptions<T, U>): UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T, U>, T>> {
  input = typeof input === 'string' ? { src: input } : input
  options = defu(options, useNuxtScriptRuntimeConfig()?.defaultScriptOptions) as NuxtUseScriptOptions<T, U>

  if (options.trigger === 'onNuxtReady')
    options.trigger = onNuxtReady
  const nuxtApp = useNuxtApp()
  const id = resolveScriptKey(input) as keyof typeof nuxtApp._scripts
  nuxtApp.$scripts = nuxtApp.$scripts! || reactive({})
  const exists = !!(nuxtApp.$scripts as Record<string, any>)?.[id]
  if (import.meta.client) {
    // only validate if we're initializing the script
    if (!exists) {
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
    if (exists) {
      return instance as any as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T, U>, T>>
    }
    // sync scripts to nuxtApp with debug details
    const payload: NuxtDevToolsScriptInstance = {
      ...options.devtools,
      src: input.src,
      $script: null as any as VueScriptInstance<T>,
      events: [],
    }
    nuxtApp._scripts = nuxtApp._scripts! || {}

    function syncScripts() {
      nuxtApp._scripts[instance.id] = payload
      nuxtApp.hooks.callHook('scripts:updated', { scripts: nuxtApp._scripts as any as Record<string, NuxtDevToolsScriptInstance> })
    }

    if (!nuxtApp._scripts[instance.id]) {
      const head = injectHead()
      head.hooks.hook('script:updated', (ctx) => {
        if (ctx.script.id !== instance.id)
          return
        // convert the status to a timestamp
        payload.events.push({
          type: 'status',
          status: ctx.script.status,
          at: Date.now(),
        })
        payload.$script = instance
        syncScripts()
      })
      head.hooks.hook('script:instance-fn', (ctx) => {
        if (ctx.script.id !== instance.id || String(ctx.fn).startsWith('__v_'))
          return
        // log all events
        payload.events.push({
          type: 'fn-call',
          fn: ctx.fn,
          at: Date.now(),
        })
        syncScripts()
      })
      payload.$script = instance
      payload.events.push({
        type: 'status',
        status: 'awaitingLoad',
        trigger: options?.trigger,
        at: Date.now(),
      })
      syncScripts()
    }
  }
  return instance as any as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T, U>, T>>
}
