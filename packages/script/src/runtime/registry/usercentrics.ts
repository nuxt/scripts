import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useHead } from '@unhead/vue'
import { useNuxtApp } from 'nuxt/app'
import { logger } from '../logger'
import { useRegistryScript } from '../utils'
import { createAbortablePromise, createAbortError } from '../utils/abortable-promise'
import { UsercentricsOptions } from './schemas'

export { UsercentricsOptions }

export type UsercentricsInput = RegistryScriptInput<typeof UsercentricsOptions, false, false>

export interface UsercentricsCmpEventDetail {
  type: string
  source?: string
  [key: string]: any
}

/**
 * The Usercentrics CMP v3 programmatic API exposed on `window.__ucCmp`.
 * Each method returns a Promise resolved once the CMP is ready.
 */
export interface UsercentricsCmp {
  isInitialized: () => Promise<boolean>
  isConsentRequired: () => Promise<boolean>
  showFirstLayer: () => Promise<void>
  showSecondLayer: () => Promise<void>
  showServiceDetails: (id: string) => Promise<void>
  showAutoblockerMoreInfoView: () => Promise<void>
  closeCmp: () => Promise<void>
  acceptAllConsents: () => Promise<void>
  denyAllConsents: () => Promise<void>
  saveConsents: () => Promise<void>
  updateCategoriesConsents: (consents: Array<{ categorySlug: string, consent: boolean }>) => Promise<void>
  updateServicesConsents: (consents: Array<{ templateId: string, consent: boolean }>) => Promise<void>
  updateTcfConsents: (...args: unknown[]) => Promise<void>
  refreshScripts: () => Promise<void>
  clearUserSession: () => Promise<void>
  getConsentDetails: () => Promise<Record<string, any>>
  getCmpConfig: () => Promise<Record<string, any>>
  getActiveLanguage: () => Promise<string>
  getControllerId: () => Promise<string>
  changeLanguage: (lang: string) => Promise<void>
  [key: string]: any
}

export interface UsercentricsApi {
  ucCmp: UsercentricsCmp
}

declare global {
  interface Window {
    __ucCmp?: UsercentricsCmp
  }
}

/**
 * Vendor-native Usercentrics consent helpers exposed on the composable result.
 * Use these to drive `useScript` consent triggers from CMP events.
 */
export interface UsercentricsConsent {
  /**
   * Resolves once the CMP API is ready (`UC_CMP_API_READY`) or immediately if
   * it already is. Resolves with `window.__ucCmp` so callers can query
   * consent state without polling.
   */
  whenReady: () => Promise<UsercentricsCmp>
  /**
   * Subscribe to `UC_UI_CMP_EVENT` browser events (the v3 consent change
   * event). Returns a teardown function. The callback receives the event
   * detail, e.g. `{ type: 'ACCEPT_ALL' | 'DENY_ALL' | 'SAVE', ... }`.
   */
  onConsentChange: (cb: (detail: UsercentricsCmpEventDetail, event: Event) => void) => () => void
  /** Open the privacy settings (first layer banner). */
  showFirstLayer: () => Promise<void> | void
  /** Open the detailed settings (second layer modal). */
  showSecondLayer: () => Promise<void> | void
  /** Accept all consents. */
  acceptAll: () => Promise<void> | void
  /** Reject all consents. */
  denyAll: () => Promise<void> | void
}

/**
 * Load the Usercentrics CMP v3 ("Web CMP") loader and expose typed access to
 * the `window.__ucCmp` programmatic API plus a `consent` helper with
 * `onConsentChange` for wiring consent triggers (`useScript({ trigger: ... })`)
 * to Usercentrics events.
 *
 * @see https://usercentrics.com/knowledge-hub/usercentrics-cmp-v3-migrations/
 */
export function useScriptUsercentrics<T extends UsercentricsApi>(
  _options?: UsercentricsInput,
): UseScriptContext<T, UsercentricsConsent> {
  const instance = useRegistryScript<T, typeof UsercentricsOptions>('usercentrics', (options) => {
    if (import.meta.client && options.autoblocker) {
      useHead({
        script: [{
          src: 'https://web.cmp.usercentrics.eu/modules/autoblocker.js',
          tagPosition: 'head',
          tagPriority: 'high',
        }],
      })
    }
    return {
      scriptInput: {
        'src': 'https://web.cmp.usercentrics.eu/ui/loader.js',
        'id': 'usercentrics-cmp',
        'data-ruleset-id': options.rulesetId,
        'data-language': options.language,
        'crossorigin': false,
      },
      schema: import.meta.dev ? UsercentricsOptions : undefined,
      scriptOptions: {
        use() {
          return { ucCmp: window.__ucCmp } as unknown as T
        },
      },
    }
  }, _options) as UseScriptContext<T, UsercentricsConsent>

  if (import.meta.client && !instance.consent) {
    let readyApi: UsercentricsCmp | undefined
    let readyPromise: Promise<UsercentricsCmp> | undefined
    const readyController = new AbortController()
    let disposed = false
    const cleanupReadyListener = () => {
      if (disposed)
        return
      disposed = true
      readyController.abort()
    }
    const whenReady = (): Promise<UsercentricsCmp> => {
      if (disposed)
        return Promise.reject(createAbortError('Usercentrics readiness wait was aborted'))
      if (readyApi)
        return Promise.resolve(readyApi)
      if (!readyPromise) {
        // Install the event listener before checking isInitialized() so an
        // event fired during that async check cannot be missed.
        readyPromise = createAbortablePromise<UsercentricsCmp>((resolve) => {
          const onReady = () => {
            const api = window.__ucCmp
            if (!api)
              return
            readyApi = api
            resolve(api)
          }
          window.addEventListener('UC_CMP_API_READY', onReady)
          const api = window.__ucCmp
          if (api?.isInitialized) {
            Promise.resolve()
              .then(() => api.isInitialized())
              .then((initialized) => {
                if (initialized && !readyController.signal.aborted)
                  onReady()
              })
              .catch((error) => {
                // Some bootstrap stubs throw until the ready event; the event
                // listener remains the authoritative readiness signal.
                if (!readyController.signal.aborted)
                  logger.debug('[usercentrics] Waiting for UC_CMP_API_READY after isInitialized() failed', error)
              })
          }
          return () => window.removeEventListener('UC_CMP_API_READY', onReady)
        }, {
          signal: readyController.signal,
          abortMessage: 'Usercentrics readiness wait was aborted',
        })
      }
      return readyPromise
    }

    const stopAppUnmount = useNuxtApp().hooks.hook('app:unmount' as any, cleanupReadyListener)
    const originalRemove = instance.remove
    instance.remove = () => {
      cleanupReadyListener()
      stopAppUnmount()
      return originalRemove()
    }

    instance.consent = {
      whenReady,
      onConsentChange(cb) {
        const handler = (e: Event) => cb((e as CustomEvent).detail, e)
        window.addEventListener('UC_UI_CMP_EVENT', handler)
        return () => window.removeEventListener('UC_UI_CMP_EVENT', handler)
      },
      showFirstLayer: () => window.__ucCmp?.showFirstLayer?.(),
      showSecondLayer: () => window.__ucCmp?.showSecondLayer?.(),
      acceptAll: () => window.__ucCmp?.acceptAllConsents?.(),
      denyAll: () => window.__ucCmp?.denyAllConsents?.(),
    }
  }

  return instance
}
