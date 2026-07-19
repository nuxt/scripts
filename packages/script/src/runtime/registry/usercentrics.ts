import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useHead } from '@unhead/vue'
import { logger } from '../logger'
import { useRegistryScript } from '../utils'
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
        resolve({ waitFor }) {
          return waitFor<T>((resolve) => {
            const onReady = () => {
              if (window.__ucCmp)
                resolve({ ucCmp: window.__ucCmp } as T)
            }
            // Register first so an event fired during the async readiness
            // check cannot be missed.
            window.addEventListener('UC_CMP_API_READY', onReady)
            const api = window.__ucCmp
            if (api?.isInitialized) {
              Promise.resolve(api.isInitialized())
                .then((initialized) => {
                  if (initialized)
                    onReady()
                })
                .catch((error) => {
                  // Some bootstrap stubs throw until the ready event; the
                  // listener remains the authoritative readiness signal.
                  logger.debug('[usercentrics] Waiting for UC_CMP_API_READY after isInitialized() failed', error)
                })
            }
            return () => window.removeEventListener('UC_CMP_API_READY', onReady)
          })
        },
      },
    }
  }, _options) as UseScriptContext<T, UsercentricsConsent>

  if (import.meta.client && !instance.consent) {
    const whenReady = () => instance.load().then(api => api.ucCmp)

    instance.consent = {
      whenReady,
      onConsentChange(cb) {
        if (instance.signal.aborted)
          return () => {}
        const handler = (e: Event) => cb((e as CustomEvent).detail, e)
        let active = true
        const stop = () => {
          if (!active)
            return
          active = false
          window.removeEventListener('UC_UI_CMP_EVENT', handler)
          instance.signal.removeEventListener('abort', stop)
        }
        window.addEventListener('UC_UI_CMP_EVENT', handler)
        instance.signal.addEventListener('abort', stop, { once: true })
        return stop
      },
      showFirstLayer: () => whenReady().then(api => api.showFirstLayer()),
      showSecondLayer: () => whenReady().then(api => api.showSecondLayer()),
      acceptAll: () => whenReady().then(api => api.acceptAllConsents()),
      denyAll: () => whenReady().then(api => api.denyAllConsents()),
    }
  }

  return instance
}
