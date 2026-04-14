import type { Ref } from 'vue'
import type { ConsentAdapter, ConsentState, UseScriptConsentOptions } from '../types'
import { onNuxtReady, requestIdleCallback, tryUseNuxtApp } from 'nuxt/app'
import { computed, isRef, nextTick, ref, toValue, watch } from 'vue'

export interface UseScriptConsentApi extends Promise<void> {
  /**
   * Set every Google Consent Mode v2 category to `'granted'` and resolve the awaitable promise.
   * Existing `useScriptTriggerConsent` semantics are preserved.
   */
  accept: () => void
  /**
   * Set every Google Consent Mode v2 category to `'denied'`.
   * Subscribed adapters receive an update. The load-gate promise, once resolved, stays resolved;
   * subscribers should watch `consented` to react to revocation.
   */
  revoke: () => void
  /**
   * Reactive boolean that is `true` when at least one category in `state` is `'granted'`.
   */
  consented: Ref<boolean>
  /**
   * Reactive granular consent state.
   */
  state: Ref<ConsentState>
  /**
   * Merge a partial state and fan out to subscribed adapters. Multiple calls within the same
   * tick are coalesced into a single `applyUpdate` per adapter with the merged snapshot.
   */
  update: (partial: ConsentState) => void
  /**
   * Subscribe a script's adapter. Fires `applyDefault` with the current state immediately,
   * and `applyUpdate` on every subsequent `update()`.
   */
  register: <Proxy = any>(adapter: ConsentAdapter<Proxy>, proxy: Proxy) => () => void
}

interface Subscription {
  adapter: ConsentAdapter<any>
  proxy: any
}

function createServerStub(): UseScriptConsentApi {
  const p = new Promise<void>(() => {}) as UseScriptConsentApi
  const state = ref<ConsentState>({}) as Ref<ConsentState>
  p.accept = () => {}
  p.revoke = () => {}
  p.consented = ref(false)
  p.state = state
  p.update = () => {}
  p.register = () => () => {}
  return p
}

const ALL_CATEGORIES: (keyof ConsentState)[] = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
]

/**
 * Unified consent composable. Replaces `useScriptTriggerConsent` as a superset:
 * every existing option (`consent`, `postConsentTrigger`) behaves identically, while
 * the new `default` option plus the `state` / `update` / `register` API add granular
 * Google Consent Mode v2 state with adapter fan-out to subscribed registry scripts.
 */
export function useScriptConsent(options?: UseScriptConsentOptions): UseScriptConsentApi {
  if (import.meta.server) {
    return createServerStub()
  }

  const nuxtApp = tryUseNuxtApp()
  const state = ref<ConsentState>({ ...(options?.default || {}) }) as Ref<ConsentState>

  const consented = computed<boolean>(() => {
    const current = state.value
    for (const key of ALL_CATEGORIES) {
      if (current[key] === 'granted') {
        return true
      }
    }
    return false
  }) as Ref<boolean>

  const subscriptions = new Set<Subscription>()
  let pendingFlush = false

  function scheduleFlush() {
    if (pendingFlush)
      return
    pendingFlush = true
    nextTick(() => {
      pendingFlush = false
      const snapshot = { ...state.value }
      for (const sub of subscriptions) {
        try {
          sub.adapter.applyUpdate(snapshot, sub.proxy)
        }
        catch (error) {
          if (import.meta.dev)
            console.warn('[nuxt-scripts] consent adapter update failed', error)
        }
      }
    })
  }

  function update(partial: ConsentState) {
    state.value = { ...state.value, ...partial }
    scheduleFlush()
  }

  function grantAll() {
    const next: ConsentState = { ...state.value }
    for (const key of ALL_CATEGORIES) {
      next[key] = 'granted'
    }
    state.value = next
    scheduleFlush()
  }

  function denyAll() {
    const next: ConsentState = { ...state.value }
    for (const key of ALL_CATEGORIES) {
      next[key] = 'denied'
    }
    state.value = next
    scheduleFlush()
  }

  function register<Proxy = any>(adapter: ConsentAdapter<Proxy>, proxy: Proxy): () => void {
    const sub: Subscription = { adapter, proxy }
    try {
      // fire default with the current state so the SDK sees defaults before init
      adapter.applyDefault({ ...state.value }, proxy)
      subscriptions.add(sub)
    }
    catch (error) {
      if (import.meta.dev)
        console.warn('[nuxt-scripts] consent adapter default failed', error)
      return () => {}
    }
    return () => {
      subscriptions.delete(sub)
    }
  }

  // ---- load-gate (ported from useScriptTriggerConsent, unchanged semantics) ----
  if (options?.consent) {
    if (isRef(options.consent)) {
      watch(options.consent, (_val) => {
        const val = toValue(_val)
        if (Boolean(val) && !consented.value) {
          // Promote the legacy boolean `consent` signal into a full grant so the granular
          // state stays coherent for adapter fan-out.
          grantAll()
        }
        else if (!val && consented.value) {
          denyAll()
        }
      }, { immediate: true })
    }
    else if (typeof options.consent === 'boolean') {
      if (options.consent) {
        grantAll()
      }
    }
    else if (options.consent instanceof Promise) {
      options.consent
        .then((res) => {
          const granted = typeof res === 'boolean' ? res : true
          if (granted) {
            grantAll()
          }
        })
        .catch(() => {
          // swallow, keep denied
        })
    }
  }

  const promise = new Promise<void>((resolve) => {
    let triggered = false
    // Box pattern: the watcher callback can fire synchronously via `immediate: true`,
    // before the `watch()` return value is assigned. Wrapping in an object lets us
    // read the handle lazily so we can self-cancel once triggered -- a later
    // revoke()/accept() cycle would otherwise re-run non-idempotent trigger work.
    const handle: { stop?: () => void } = {}
    handle.stop = watch(consented, (newValue, oldValue) => {
      if (newValue && !oldValue && !triggered) {
        triggered = true
        handle.stop?.()
        const runner = nuxtApp?.runWithContext || ((cb: () => void) => cb())
        if (options?.postConsentTrigger instanceof Promise) {
          options.postConsentTrigger.then(() => runner(resolve))
          return
        }
        if (typeof options?.postConsentTrigger === 'function') {
          if (options.postConsentTrigger.length === 1) {
            options.postConsentTrigger(resolve)
            return
          }
          const val = (options.postConsentTrigger as (() => Promise<any>))()
          if (val instanceof Promise) {
            return val.then(() => runner(resolve))
          }
          return
        }
        if (options?.postConsentTrigger === 'onNuxtReady') {
          const idleTimeout = options?.postConsentTrigger ? (nuxtApp ? onNuxtReady : requestIdleCallback) : (cb: () => void) => cb()
          runner(() => idleTimeout(resolve))
          return
        }
        runner(resolve)
      }
    }, { immediate: true })
  }) as UseScriptConsentApi

  promise.accept = grantAll
  promise.revoke = denyAll
  promise.consented = consented
  promise.state = state
  promise.update = update
  promise.register = register

  return promise
}
