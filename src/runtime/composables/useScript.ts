import type { UseScriptInput, VueScriptInstance, MaybeComputedRefEntriesOnly } from '@unhead/vue'
import type { UseScriptOptions, UseFunctionType, Head, DataKeys, SchemaAugmentations, ScriptBase } from '@unhead/schema'
import { resolveScriptKey } from 'unhead'
import { defu } from 'defu'
import { useScript as _useScript } from '@unhead/vue'
import { injectHead, onNuxtReady, useHead, useNuxtApp, useRuntimeConfig, reactive } from '#imports'
import type { NuxtDevToolsScriptInstance, NuxtUseScriptOptions, UseScriptContext, WarmupStrategy } from '#nuxt-scripts'

function useNuxtScriptRuntimeConfig() {
  return useRuntimeConfig().public['nuxt-scripts'] as {
    defaultScriptOptions: NuxtUseScriptOptions
  }
}

const ValidPreloadTriggers = ['onNuxtReady', 'client']
const PreconnectServerModes = ['preconnect', 'dns-prefetch']

type ResolvedScriptInput = (MaybeComputedRefEntriesOnly<Omit<ScriptBase & DataKeys & SchemaAugmentations['script'], 'src'>> & { src: string })
function warmup(_: ResolvedScriptInput, rel: WarmupStrategy, head: any) {
  const { src } = _
  const $url = new URL(src || '/', 'http://localhost')
  const isPreconnect = rel && PreconnectServerModes.includes(rel)
  const href = isPreconnect ? $url.origin : src
  const isCrossOrigin = $url.origin !== 'http://localhost'
  if (!rel || (isPreconnect && !isCrossOrigin)) {
    return
  }
  const defaults: Required<Head>['link'][0] = {
    fetchpriority: 'low',
  }
  if (rel === 'preload') {
    defaults.as = 'script'
  }
  // is absolute, add privacy headers
  if (isCrossOrigin) {
    defaults.crossorigin = 'anonymous'
    defaults.referrerpolicy = 'no-referrer'
  }
  return useHead({
    link: [{
      ...defaults,
      ...{
        rel,
        crossorigin: _.crossorigin,
        referrerpolicy: _.referrerpolicy,
      },
      href,
    }],
  }, {
    head,
    tagPriority: 'high',
  })
}

export function useScript<T extends Record<symbol | string, any> = Record<symbol | string, any>, U = Record<symbol | string, any>>(input: UseScriptInput, options?: NuxtUseScriptOptions<T, U>): UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T, U>, T>> {
  input = typeof input === 'string' ? { src: input } : input
  options = defu(options, useNuxtScriptRuntimeConfig()?.defaultScriptOptions) as NuxtUseScriptOptions<T, U>
  // browser hint optimizations
  const id = String(resolveScriptKey(input) as keyof typeof nuxtApp._scripts)
  const nuxtApp = useNuxtApp()
  const head = options.head || injectHead()
  nuxtApp.$scripts = nuxtApp.$scripts! || reactive({})
  const exists = !!(nuxtApp.$scripts as Record<string, any>)?.[id]

  // need to make sure it's not already registered
  if (!options.warmupStrategy && ValidPreloadTriggers.includes(String(options.trigger))) {
    options.warmupStrategy = 'preload'
  }
  if (options.trigger === 'onNuxtReady') {
    options.trigger = onNuxtReady
  }
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
  const instance = _useScript<T>(input, options as any as UseScriptOptions<T>) as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T, U>, T>>
  instance.warmup = (rel) => {
    if (!instance._warmupEl) {
      instance._warmupEl = warmup(input, rel, head)
    }
  }
  if (options.warmupStrategy) {
    instance.warmup(options.warmupStrategy)
  }
  const _remove = instance.remove
  instance.remove = () => {
    instance._warmupEl?.dispose()
    nuxtApp.$scripts[id] = undefined
    return _remove()
  }
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
