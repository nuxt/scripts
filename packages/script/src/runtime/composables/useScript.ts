import type { UseScriptInput, UseScriptOptions, VueScriptInstance } from '@unhead/vue/scripts'
import type { NuxtDevToolsNetworkRequest, NuxtDevToolsScriptInstance, NuxtUseScriptOptions, UseFunctionType, UseScriptContext } from '../types'
// @ts-expect-error virtual template
import { resolveTrigger } from '#build/nuxt-scripts-trigger-resolver'
import { useScript as _useScript } from '@unhead/vue/scripts'
import { defu } from 'defu'
import { injectHead, onNuxtReady, useHead, useNuxtApp, useRuntimeConfig } from 'nuxt/app'
import { markRaw, ref } from 'vue'
import { logger } from '../logger'

type NuxtScriptsApp = ReturnType<typeof useNuxtApp> & {
  $scripts: Record<string, UseScriptContext<any> | undefined>
  _scripts: Record<string, NuxtDevToolsScriptInstance>
}

/**
 * Devtools network tracking utilities.
 * All functions below are only called inside `import.meta.dev` guards,
 * so bundlers eliminate them (and their closures) in production builds.
 */

function resolveProxyPrefix(): string {
  const devtoolsConfig = useRuntimeConfig().public['nuxt-scripts-devtools'] as any
  return devtoolsConfig?.proxyPrefix || '/_scripts/p'
}

function toNetworkRequest(entry: PerformanceResourceTiming, proxyPrefix: string): NuxtDevToolsNetworkRequest {
  const isProxied = entry.name.includes(`${proxyPrefix}/`)
  return {
    url: entry.name,
    startTime: entry.startTime,
    duration: entry.duration,
    transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize,
    decodedBodySize: entry.decodedBodySize,
    initiatorType: entry.initiatorType,
    dns: entry.domainLookupEnd - entry.domainLookupStart,
    connect: entry.connectEnd - entry.connectStart,
    ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
    ttfb: entry.responseStart - entry.requestStart,
    download: entry.responseEnd - entry.responseStart,
    isProxied,
  }
}

function createDomainMatcher(domains: Set<string>, proxyPrefix: string) {
  const localHostname = window.location.hostname
  return function matchesScript(entry: PerformanceResourceTiming): boolean {
    try {
      const entryUrl = new URL(entry.name, window.location.origin)
      // Skip same-origin hostname matching to avoid capturing unrelated
      // same-origin requests (API calls, images, HMR, etc.)
      if (entryUrl.hostname !== localHostname && domains.has(entryUrl.hostname))
        return true
      // match proxied paths: <proxyPrefix>/<domain>/...
      const proxyPath = `${proxyPrefix}/`
      const proxyIdx = entryUrl.pathname.indexOf(proxyPath)
      if (proxyIdx !== -1) {
        const afterPrefix = entryUrl.pathname.slice(proxyIdx + proxyPath.length)
        const proxyDomain = afterPrefix.split('/')[0]
        if (proxyDomain && domains.has(proxyDomain))
          return true
      }
    }
    catch {} // malformed URLs are expected, safe to ignore
    return false
  }
}

function observeNetworkRequests(
  payload: NuxtDevToolsScriptInstance,
  domains: Set<string>,
  onUpdate: () => void,
): () => void {
  if (typeof PerformanceObserver === 'undefined')
    return () => {}

  const proxyPrefix = resolveProxyPrefix()
  const matchesScript = createDomainMatcher(domains, proxyPrefix)
  const seen = new Set<string>()

  function entryKey(entry: PerformanceResourceTiming): string {
    return `${entry.name}@${entry.startTime}`
  }

  function processEntry(entry: PerformanceResourceTiming): boolean {
    const key = entryKey(entry)
    if (seen.has(key))
      return false
    if (!matchesScript(entry))
      return false
    seen.add(key)
    payload.networkRequests.push(toNetworkRequest(entry, proxyPrefix))
    return true
  }

  for (const entry of performance.getEntriesByType('resource') as PerformanceResourceTiming[])
    processEntry(entry)

  const observer = new PerformanceObserver((list) => {
    let added = false
    for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
      if (processEntry(entry))
        added = true
    }
    if (added)
      onUpdate()
  })
  observer.observe({ type: 'resource', buffered: false })

  return () => observer.disconnect()
}

/**
 * Extract a non-local hostname from a script src, or empty string.
 * Skips same-origin hostnames so they don't match all local resources.
 */
function extractExternalHostname(src: string | undefined): string {
  if (!src)
    return ''
  try {
    const hostname = new URL(src, window.location.origin).hostname
    return hostname === window.location.hostname ? '' : hostname
  }
  catch { return '' }
}

function ensureScripts(nuxtApp: NuxtScriptsApp) {
  // When registry scripts are configured, the plugin provides $scripts via Nuxt's
  // provide() which creates a getter-only property. We must not reassign it.
  // When no plugin provides it, we need to initialize it ourselves.
  if (!nuxtApp.$scripts) {
    nuxtApp.$scripts = {}
  }
}

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

  // Partytown quick-path: use useHead for SSR rendering
  // Partytown needs scripts in initial HTML with type="text/partytown"
  if (options.partytown) {
    const src = input.src
    if (!src) {
      throw new Error('useScript with partytown requires a src')
    }
    useHead({
      script: [{ src, type: 'text/partytown' }],
    })
    const nuxtApp = useNuxtApp() as NuxtScriptsApp
    ensureScripts(nuxtApp)
    const status = ref('loaded')
    let disconnectObserver = () => {}
    const stub = {
      id: src,
      status,
      load: () => Promise.resolve({} as T),
      remove: () => {
        disconnectObserver()
        return false
      },
      entry: undefined,
    } as any as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>>
    nuxtApp.$scripts[src] = stub

    // Partytown devtools: partytown routes requests through the first-party proxy
    // (same-origin), so they appear in the main thread's Performance API
    if (import.meta.dev && import.meta.client) {
      nuxtApp._scripts = nuxtApp._scripts || {}
      const scriptHostname = extractExternalHostname(src)
      const domains = new Set<string>([
        ...(scriptHostname ? [scriptHostname] : []),
        ...(options.devtools?.domains || []),
      ])
      const payload: NuxtDevToolsScriptInstance = {
        ...options.devtools,
        src,
        $script: stub as any,
        events: [
          { type: 'status', status: 'loaded', at: Date.now() },
        ],
        networkRequests: [],
      }

      function syncScripts() {
        nuxtApp._scripts[src] = payload
        nuxtApp.hooks.callHook('scripts:updated' as any, { scripts: nuxtApp._scripts })
      }

      disconnectObserver = observeNetworkRequests(payload, domains, syncScripts)
      syncScripts()
    }

    return stub
  }

  // Warn about unsupported bundling for dynamic sources (internal value set by transform)
  if (import.meta.dev && (options.bundle as any) === 'unsupported') {
    console.warn('[Nuxt Scripts] Bundling is not supported for dynamic script sources. Static URLs are required for bundling.')
    // Reset to false to prevent any unexpected behavior
    options.bundle = false
  }

  // Handle trigger objects (idleTimeout, interaction)
  if (options.trigger && typeof options.trigger === 'object' && !('then' in options.trigger)) {
    const resolved = resolveTrigger(options.trigger)
    if (resolved) {
      options.trigger = resolved
    }
  }

  // browser hint optimizations
  const nuxtApp = useNuxtApp() as NuxtScriptsApp
  const id = String(resolveScriptKey(input))
  options.head = options.head || injectHead()
  if (!options.head) {
    throw new Error('useScript() has been called without Nuxt context.')
  }
  ensureScripts(nuxtApp)
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

  const instance = _useScript<T>(input, options as any as UseScriptOptions<T>) as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>> & { reload: () => Promise<T> }
  const _remove = instance.remove
  instance.remove = () => {
    nuxtApp.$scripts[id] = undefined
    return _remove()
  }
  const _load = instance.load
  instance.load = async () => {
    if (err) {
      return Promise.reject(err)
    }
    return _load()
  }
  // Add reload method for scripts that need to re-execute (e.g., DOM-scanning scripts)
  instance.reload = async () => {
    instance.remove()
    // Use unique key to bypass Unhead's deduplication
    const reloadInput = typeof input === 'string'
      ? { src: input, key: `${id}-${Date.now()}` }
      : { ...input, key: `${id}-${Date.now()}` }
    // Re-create the script entry
    const reloaded = _useScript<T>(reloadInput, { ...options, trigger: 'client' } as any as UseScriptOptions<T>)
    // Copy over the new instance properties
    Object.assign(instance, {
      status: reloaded.status,
      entry: reloaded.entry,
    })
    return reloaded.load()
  }
  nuxtApp.$scripts[id] = instance

  // Wire unified consent: if a consent API is attached and the registry declared an adapter,
  // subscribe so the adapter receives `applyDefault` with current state plus `applyUpdate`
  // on each granular update. Scope A wires the adapter on individual registry entries.
  if (import.meta.client && options.consent && options._consentAdapter && typeof options.consent.register === 'function') {
    if (import.meta.dev && (options as any).defaultConsent) {
      console.warn('[nuxt-scripts] Both `consent` (composable) and `defaultConsent` (per-script) are set. The composable takes precedence.')
    }
    const unregister = options.consent.register(options._consentAdapter, instance)
    const _removeWithUnregister = instance.remove
    instance.remove = () => {
      unregister()
      return _removeWithUnregister()
    }
  }
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
      networkRequests: [],
    }
    nuxtApp._scripts = nuxtApp._scripts! || {}

    function syncScripts() {
      nuxtApp._scripts[instance.id] = payload
      nuxtApp.hooks.callHook('scripts:updated' as any, { scripts: nuxtApp._scripts })
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

      // Network request tracking via Resource Timing API
      const scriptHostname = extractExternalHostname(input.src)
      const domains = new Set<string>([
        ...(scriptHostname ? [scriptHostname] : []),
        ...(options.devtools?.domains || []),
      ])
      let disconnectObserver = observeNetworkRequests(payload, domains, syncScripts)
      // Clean up observer when script is removed, but keep it alive across reload()
      const _origRemove = instance.remove
      const _origReload = instance.reload
      instance.remove = () => {
        disconnectObserver()
        return _origRemove()
      }
      instance.reload = async () => {
        // Disconnect before reload, reconnect after so new network entries are tracked
        disconnectObserver()
        const result = await _origReload()
        disconnectObserver = observeNetworkRequests(payload, domains, syncScripts)
        return result
      }

      syncScripts()
    }
  }
  // Prevent Vue from making the instance deeply reactive, and guard against
  // circular JSON errors if anything calls JSON.stringify on it (Vue 3.5+
  // refs have circular `.dep` properties).
  markRaw(instance as any)
  ;(instance as any).toJSON = () => ({ id: instance.id, status: instance.status.value })
  return instance as any as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>>
}
