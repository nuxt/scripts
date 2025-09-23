import type { UseScriptInput, UseScriptOptions, VueScriptInstance } from '@unhead/vue/scripts'
import { defu } from 'defu'
import { useScript as _useScript } from '@unhead/vue/scripts'
import { reactive } from 'vue'
import type { NuxtDevToolsScriptInstance, NuxtUseScriptOptions, UseFunctionType, UseScriptContext } from '../types'
import { onNuxtReady, useNuxtApp, useRuntimeConfig, injectHead } from '#imports'
import { logger } from '../logger'

function useNuxtScriptRuntimeConfig() {
  return useRuntimeConfig().public['nuxt-scripts'] as {
    defaultScriptOptions: NuxtUseScriptOptions
  }
}

export function resolveScriptKey(input: any): string {
  return input.key || input.src || (typeof input.innerHTML === 'string' ? input.innerHTML : '')
}

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>>(input: UseScriptInput, options?: NuxtUseScriptOptions<T>): UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>> {
  input = typeof input === 'string' ? { src: input } : input
  options = defu(options, useNuxtScriptRuntimeConfig()?.defaultScriptOptions) as NuxtUseScriptOptions<T>

  // Warn about unsupported bundling for dynamic sources (internal value set by transform)
  if (import.meta.dev && (options.bundle as any) === 'unsupported') {
    console.warn('[Nuxt Scripts] Bundling is not supported for dynamic script sources. Static URLs are required for bundling.')
    // Reset to false to prevent any unexpected behavior
    options.bundle = false
  }

  // browser hint optimizations
  const id = String(resolveScriptKey(input) as keyof typeof nuxtApp._scripts)
  const nuxtApp = useNuxtApp()
  options.head = options.head || injectHead()
  if (!options.head) {
    throw new Error('useScript() has been called without Nuxt context.')
  }
  nuxtApp.$scripts = nuxtApp.$scripts! || reactive({})
  const exists = !!(nuxtApp.$scripts as Record<string, any>)?.[id]

  const err = options._validate?.()
  if (import.meta.dev && import.meta.client && err) {
    // never resolves
    options.trigger = new Promise(() => {})
    if (!exists) {
      let out = `Skipping script \`${id}\` due to invalid options:\n`
      for (const e of err.issues) {
        out += (`  ${e.message}\n`)
      }
      logger.info(out)
    }
  }
  else if (options.trigger === 'onNuxtReady' || options.trigger === 'client') {
    if (!options.warmupStrategy) {
      options.warmupStrategy = 'preload'
    }
    if (options.trigger === 'onNuxtReady') {
      options.trigger = onNuxtReady
    }
  }

  const instance = _useScript<T>(input, options as any as UseScriptOptions<T>) as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>>
  const _remove = instance.remove
  instance.remove = () => {
    nuxtApp.$scripts[id] = undefined
    return _remove()
  }
  instance.load = async () => {
    if (err) {
      return Promise.reject(err)
    }
    return instance.load()
  }
  nuxtApp.$scripts[id] = instance
  // used for devtools integration
  if (import.meta.dev && import.meta.client) {
    if (exists) {
      return instance as any as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>>
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
      options.head.hooks.hook('script:updated', (ctx) => {
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
      // @ts-expect-error untyped
      options.head.hooks.hook('script:instance-fn', (ctx) => {
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
      if (err) {
        payload.events.push({
          type: 'status',
          status: 'validation-failed',
          args: err,
          at: Date.now(),
        })
      }
      payload.events.push({
        type: 'status',
        status: 'awaitingLoad',
        trigger: options?.trigger,
        at: Date.now(),
      })
      syncScripts()
    }
  }
  return instance as any as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>>
}
