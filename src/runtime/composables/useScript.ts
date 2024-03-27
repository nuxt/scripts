import { type UseScriptInput, type VueScriptInstance, useScript as _useScript, injectHead } from '@unhead/vue'
import type { UseScriptOptions } from '@unhead/schema'
import { onNuxtReady, useNuxtApp } from '#imports'
import type { NuxtUseScriptOptions } from '#nuxt-scripts'

export function useScript<T>(input: UseScriptInput, options?: NuxtUseScriptOptions) {
  input = typeof input === 'string' ? { src: input } : input
  options = options || {}
  if (options.trigger === 'onNuxtReady')
    // @ts-expect-error untyped
    options.trigger = onNuxtReady
  const nuxtApp = useNuxtApp()
  const instance = _useScript<T>(input, options as any as UseScriptOptions<T>)
  // used for devtools integration
  if (import.meta.dev && import.meta.client) {
    // sync scripts to nuxtApp with debug details
    const payload = {
      key: input.key || input.src,
      src: input.src,
      $script: null as any as VueScriptInstance<T>,
      events: [] as any[],
    }
    nuxtApp._scripts = nuxtApp._scripts! || {}

    function syncScripts() {
      nuxtApp._scripts[instance.$script.id] = payload
      nuxtApp.hooks.callHook('scripts:updated', { scripts: nuxtApp._scripts })
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
        if (ctx.script.id !== instance.$script.id)
          return
        // log all events
        payload.events.push({
          type: 'fn-call',
          fn: ctx.fn,
          args: ctx.args,
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
