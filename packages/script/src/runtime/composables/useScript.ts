import type { UseScriptInput, UseScriptOptions, VueScriptInstance } from '@unhead/vue/scripts'
import type { NuxtDevToolsNetworkRequest, NuxtDevToolsScriptInstance, NuxtUseScriptOptions, UseFunctionType, UseScriptContext } from '../types'
import { useScript as _useScript } from '@unhead/vue/scripts'
import { defu } from 'defu'
import { injectHead, onNuxtReady, useHead, useNuxtApp, useRuntimeConfig } from 'nuxt/app'
import { markRaw, ref } from 'vue'
// @ts-expect-error virtual template
import { resolveTrigger } from '#build/nuxt-scripts-trigger-resolver'
import { debugEnabled } from '../debug'
import { logger } from '../logger'

type NuxtScriptsApp = ReturnType<typeof useNuxtApp> & {
  $scripts: Record<string, UseScriptContext<any> | undefined>
  _scripts: Record<string, NuxtDevToolsScriptInstance>
}

const DEVTOOLS_EVENT_LIMIT = 250
const DEVTOOLS_NETWORK_REQUEST_LIMIT = 500

function pushBounded<T>(items: T[], item: T, limit: number): void {
  items.push(item)
  if (items.length > limit)
    items.splice(0, items.length - limit)
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

function createDomainMatcher(domains: Set<string>, proxyPrefix: string, scriptSrc: string | undefined) {
  const localHostname = window.location.hostname
  // alias → real domain, so aliased proxy paths (/_scripts/p/<alias>/...) still attribute
  const aliasToDomain = (useRuntimeConfig().public['nuxt-scripts-devtools'] as any)?.aliasToDomain || {}
  const scriptUrl = (() => {
    if (!scriptSrc)
      return ''
    try {
      return new URL(scriptSrc, window.location.origin).href
    }
    catch { return '' }
  })()
  return function matchesScript(entry: PerformanceResourceTiming): boolean {
    try {
      const entryUrl = new URL(entry.name, window.location.origin)
      // Always match the script's own request, regardless of origin
      if (scriptUrl && entryUrl.href === scriptUrl)
        return true
      // Skip same-origin hostname matching to avoid capturing unrelated
      // same-origin requests (API calls, images, HMR, etc.)
      if (entryUrl.hostname !== localHostname && domains.has(entryUrl.hostname))
        return true
      // match proxied paths: <proxyPrefix>/<domain>/...
      const proxyPath = `${proxyPrefix}/`
      const proxyIdx = entryUrl.pathname.indexOf(proxyPath)
      if (proxyIdx !== -1) {
        const afterPrefix = entryUrl.pathname.slice(proxyIdx + proxyPath.length)
        const proxySegment = afterPrefix.split('/')[0]
        const proxyDomain = proxySegment ? (aliasToDomain[proxySegment] || proxySegment) : undefined
        if (proxyDomain && domains.has(proxyDomain))
          return true
      }
    }
    catch {
      // Malformed PerformanceResourceTiming URLs cannot match this script.
    }
    return false
  }
}

function observeNetworkRequests(
  payload: NuxtDevToolsScriptInstance,
  domains: Set<string>,
  onUpdate: () => void,
  scriptSrc?: string,
): () => void {
  if (typeof PerformanceObserver === 'undefined')
    return () => {}

  const proxyPrefix = resolveProxyPrefix()
  const matchesScript = createDomainMatcher(domains, proxyPrefix, scriptSrc)
  const seen = new Set<string>()
  const seenOrder: string[] = []

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
    seenOrder.push(key)
    if (seenOrder.length > DEVTOOLS_NETWORK_REQUEST_LIMIT) {
      const oldest = seenOrder.shift()
      if (oldest)
        seen.delete(oldest)
    }
    pushBounded(payload.networkRequests, toNetworkRequest(entry, proxyPrefix), DEVTOOLS_NETWORK_REQUEST_LIMIT)
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
  if (!import.meta.client && options.use) {
    options.use = (() => undefined) as typeof options.use
  }

  // Partytown quick-path: use useHead for SSR rendering
  // Partytown needs scripts in initial HTML with type="text/partytown"
  if (options.partytown) {
    const src = input.src
    if (!src) {
      throw new Error('useScript with partytown requires a src')
    }
    useHead({
      script: [{ src, type: 'text/partytown' as 'text/javascript' }],
    })
    const nuxtApp = useNuxtApp() as NuxtScriptsApp
    ensureScripts(nuxtApp)
    const existing = nuxtApp.$scripts[src]
    if (existing)
      return existing as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>>

    const status = ref('loaded')
    let disconnectObserver = () => {}
    let stopAppUnmountHook = () => {}
    let cleaned = false
    let stub: UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>>
    const cleanup = () => {
      if (cleaned)
        return
      cleaned = true
      disconnectObserver()
      stopAppUnmountHook()
      if (nuxtApp.$scripts[src] === stub)
        delete nuxtApp.$scripts[src]
      if (import.meta.dev && import.meta.client && nuxtApp._scripts?.[src]) {
        delete nuxtApp._scripts[src]
        nuxtApp.hooks.callHook('scripts:updated' as any, { scripts: nuxtApp._scripts })
      }
    }
    stub = {
      id: src,
      status,
      load: () => Promise.resolve({} as T),
      remove: () => {
        cleanup()
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
        if (cleaned)
          return
        nuxtApp._scripts[src] = payload
        nuxtApp.hooks.callHook('scripts:updated' as any, { scripts: nuxtApp._scripts })
      }

      disconnectObserver = observeNetworkRequests(payload, domains, syncScripts, src)
      syncScripts()
    }

    stopAppUnmountHook = nuxtApp.hooks.hook('app:unmount' as any, cleanup)

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
  options.head = options.head || injectHead() as NonNullable<typeof options.head>
  if (!options.head) {
    throw new Error('useScript() has been called without Nuxt context.')
  }
  const headHooks = options.head.hooks!
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
    // `false` is a valid value to disable warmup (#826)
    if (options.warmupStrategy === undefined) {
      options.warmupStrategy = 'preload'
    }
    if (options.trigger === 'onNuxtReady') {
      options.trigger = onNuxtReady
    }
  }

  const unheadOptions = { ...options }
  const instance = _useScript<T>(input, unheadOptions as any as UseScriptOptions<T>) as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>> & { reload: () => Promise<T> }
  // @unhead/vue v2 mutates the passed object with the current component. The
  // core script keeps that options object, so release the component reference
  // after event handlers have been bound. Newer Unhead versions clone it.
  delete (unheadOptions as any).eventContext
  // _useScript still needs to run for repeated calls so @unhead/vue can bind
  // caller callbacks to the active Vue scope. Decorate the shared resource only
  // once so repeated mounts do not stack app-global hooks and wrappers.
  if (exists)
    return instance as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>>

  markRaw(instance as any)
  ;(instance as any).toJSON = () => ({ id: instance.id, status: instance.status.value })

  const cleanupFns = new Set<() => void>()
  let cleaned = false
  const addCleanup = (cleanup: () => void) => {
    if (cleaned)
      cleanup()
    else
      cleanupFns.add(cleanup)
  }
  const cleanupInstance = () => {
    if (cleaned)
      return
    cleaned = true
    for (const cleanup of cleanupFns)
      cleanup()
    cleanupFns.clear()
    if (nuxtApp.$scripts[id] === instance)
      delete nuxtApp.$scripts[id]
    if (import.meta.dev && import.meta.client && nuxtApp._scripts?.[instance.id]) {
      delete nuxtApp._scripts[instance.id]
      nuxtApp.hooks.callHook('scripts:updated' as any, { scripts: nuxtApp._scripts })
    }
  }

  let currentRemove = instance.remove
  let currentLoad = instance.load
  instance.remove = () => {
    const result = currentRemove()
    cleanupInstance()
    return result
  }
  instance.load = async () => {
    if (err) {
      return Promise.reject(err)
    }
    return currentLoad()
  }
  // Add reload method for scripts that need to re-execute (e.g., DOM-scanning scripts)
  instance.reload = async () => {
    if (err)
      return Promise.reject(err)

    // Remove only the current Unhead entry. Runtime observers/hooks belong to
    // this stable public instance and remain active across the reload.
    currentRemove()
    // Use unique key to bypass Unhead's deduplication
    const reloadInput = typeof input === 'string'
      ? { src: input, key: `${id}-${Date.now()}` }
      : { ...input, key: `${id}-${Date.now()}` }
    // Re-create the script entry
    const reloaded = _useScript<T>(reloadInput, { ...options, trigger: 'client' } as any as UseScriptOptions<T>)
    currentRemove = reloaded.remove
    currentLoad = reloaded.load
    // Both supported @unhead/vue majors expose status through `_statusRef`.
    // Repoint it without overwriting the core script's string status.
    ;(instance as any)._statusRef = reloaded.status
    instance.entry = reloaded.entry
    return currentLoad()
  }
  nuxtApp.$scripts[id] = instance
  addCleanup(nuxtApp.hooks.hook('app:unmount' as any, () => {
    currentRemove()
    cleanupInstance()
  }))

  // Debug logging: emit a structured log per script lifecycle event when debug
  // is enabled at build-time (or in dev). Tagged with registryKey when present
  // (e.g. `googleTagManager`), else the script id (src/key).
  if (import.meta.client && debugEnabled && !exists) {
    const registryKey = options?.devtools?.registryKey as string | undefined
    const src = (input as any)?.src
    const trigger = options?.trigger
    const loadedFrom = options?.devtools?.loadedFrom as string | undefined
    const ctx = {
      id: instance.id,
      ...(registryKey ? { registryKey } : {}),
      ...(src ? { src } : {}),
      ...(loadedFrom ? { loadedFrom } : {}),
    }
    const log = logger.withTag(registryKey || instance.id)
    const t0 = performance.now()
    let tLoadStart = 0
    log.debug('registered', {
      ...ctx,
      trigger: typeof trigger === 'object' ? (trigger instanceof Promise ? 'promise' : JSON.stringify(trigger)) : trigger,
    })
    addCleanup(headHooks.hook('script:updated', (entry) => {
      if (entry.script.id !== instance.id)
        return
      const status = entry.script.status
      const elapsed = Math.round(performance.now() - t0)
      if (status === 'loading')
        tLoadStart = performance.now()
      const payload: Record<string, any> = { ...ctx, status, elapsedMs: elapsed }
      if (status === 'loaded' && tLoadStart)
        payload.loadMs = Math.round(performance.now() - tLoadStart)
      const fn = status === 'error' ? log.warn : log.debug
      fn(`status: ${status}`, payload)
    }))
    const _origLoad = instance.load
    instance.load = () => {
      log.debug('load() called', ctx)
      return _origLoad()
    }
    const _origRemove = instance.remove
    instance.remove = () => {
      log.debug('remove() called', ctx)
      return _origRemove()
    }
    const _origReload = instance.reload
    instance.reload = async () => {
      log.debug('reload() called', ctx)
      return _origReload()
    }
  }

  // used for devtools integration
  if (import.meta.dev && import.meta.client) {
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
      if (cleaned)
        return
      nuxtApp._scripts[instance.id] = payload
      nuxtApp.hooks.callHook('scripts:updated' as any, { scripts: nuxtApp._scripts })
    }

    if (!nuxtApp._scripts[instance.id]) {
      addCleanup(headHooks.hook('script:updated', (ctx) => {
        if (ctx.script.id !== instance.id)
          return
        // convert the status to a timestamp
        pushBounded(payload.events, {
          type: 'status',
          status: ctx.script.status,
          at: Date.now(),
        }, DEVTOOLS_EVENT_LIMIT)
        payload.$script = instance
        syncScripts()
      }))
      // @ts-expect-error untyped
      addCleanup(headHooks.hook('script:instance-fn', (ctx) => {
        if (ctx.script.id !== instance.id || String(ctx.fn).startsWith('__v_'))
          return
        // log all events
        pushBounded(payload.events, {
          type: 'fn-call',
          fn: ctx.fn,
          at: Date.now(),
        }, DEVTOOLS_EVENT_LIMIT)
        syncScripts()
      }))
      payload.$script = instance
      if (err) {
        pushBounded(payload.events, {
          type: 'status',
          status: 'validation-failed',
          args: err,
          at: Date.now(),
        }, DEVTOOLS_EVENT_LIMIT)
      }
      pushBounded(payload.events, {
        type: 'status',
        status: 'awaitingLoad',
        trigger: options?.trigger,
        at: Date.now(),
      }, DEVTOOLS_EVENT_LIMIT)

      // Network request tracking via Resource Timing API
      const scriptHostname = extractExternalHostname(input.src)
      const domains = new Set<string>([
        ...(scriptHostname ? [scriptHostname] : []),
        ...(options.devtools?.domains || []),
      ])
      let disconnectObserver = observeNetworkRequests(payload, domains, syncScripts, input.src)
      addCleanup(() => disconnectObserver())
      // Clean up observer when script is removed, but keep it alive across reload()
      const _origReload = instance.reload
      instance.reload = async () => {
        // Disconnect before reload, reconnect after so new network entries are tracked
        disconnectObserver()
        try {
          return await _origReload()
        }
        finally {
          if (!cleaned)
            disconnectObserver = observeNetworkRequests(payload, domains, syncScripts, input.src)
        }
      }

      syncScripts()
    }
  }
  return instance as any as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>>
}
