import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useRegistryScript } from '../utils'
import { UsercentricsOptions } from './schemas'

export { UsercentricsOptions }

export type UsercentricsInput = RegistryScriptInput<typeof UsercentricsOptions, false, false>

export interface UsercentricsService {
  id: string
  name: string
  consent: { status: boolean }
  [key: string]: any
}

export interface UsercentricsCmpEventDetail {
  type: string
  source?: string
  [key: string]: any
}

export interface UsercentricsUI {
  isInitialized: () => boolean
  showFirstLayer: () => void
  showSecondLayer: () => void
  acceptAllConsents: () => Promise<void>
  denyAllConsents: () => Promise<void>
  getServicesBaseInfo: () => UsercentricsService[]
  getCMPData: () => Record<string, any>
  [key: string]: any
}

export interface UsercentricsApi {
  UC_UI: UsercentricsUI
}

declare global {
  interface Window {
    UC_UI?: UsercentricsUI
  }
}

/**
 * Vendor-native Usercentrics consent helpers exposed on the composable result.
 * Use these to drive `useScript` consent triggers from CMP events.
 */
export interface UsercentricsConsent {
  /**
   * Resolves once the CMP has fired `UC_UI_INITIALIZED` (or immediately if it
   * already initialised). Resolves with the `UC_UI` global so callers can
   * query consent state without polling.
   */
  whenReady: () => Promise<UsercentricsUI>
  /**
   * Subscribe to `UC_CONSENT` browser events. Returns a teardown function.
   * The callback receives the raw event detail emitted by Usercentrics.
   */
  onConsentChange: (cb: (detail: any, event: Event) => void) => () => void
  /** Open the privacy settings (first layer banner). */
  showFirstLayer: () => void
  /** Open the detailed settings (second layer modal). */
  showSecondLayer: () => void
  /** Accept all consents. */
  acceptAll: () => Promise<void> | void
  /** Reject all consents. */
  denyAll: () => Promise<void> | void
}

/**
 * Load the Usercentrics CMP loader and expose typed access to the `UC_UI`
 * global plus a `consent` helper with `onConsentChange` for wiring consent
 * triggers (`useScript({ trigger: ... })`) to Usercentrics events.
 *
 * @see https://docs.usercentrics.com/cmp_in_app_sdk/latest/getting_started/web/
 */
export function useScriptUsercentrics<T extends UsercentricsApi>(
  _options?: UsercentricsInput,
): UseScriptContext<T, UsercentricsConsent> {
  const instance = useRegistryScript<T, typeof UsercentricsOptions>('usercentrics', (options) => {
    const version = options.version || 'latest'
    return {
      scriptInput: {
        // The CMP loader is identified by id + data-settings-id; both are
        // required for the loader to bootstrap.
        'src': `https://app.usercentrics.eu/browser-ui/${version}/loader.js`,
        'id': 'usercentrics-cmp',
        'data-settings-id': options.settingsId || '',
        'data-tcf-enabled': options.tcfEnabled ? 'true' : undefined,
        'data-language': options.language,
        'data-embedding-type': options.embeddingType,
        'crossorigin': false,
      },
      schema: import.meta.dev ? UsercentricsOptions : undefined,
      scriptOptions: {
        use() {
          return { UC_UI: window.UC_UI } as unknown as T
        },
      },
    }
  }, _options) as UseScriptContext<T, UsercentricsConsent>

  if (import.meta.client && !instance.consent) {
    const whenReady = (): Promise<UsercentricsUI> => new Promise((resolve) => {
      if (window.UC_UI?.isInitialized?.())
        return resolve(window.UC_UI)
      const onInit = () => {
        window.removeEventListener('UC_UI_INITIALIZED', onInit)
        resolve(window.UC_UI as UsercentricsUI)
      }
      window.addEventListener('UC_UI_INITIALIZED', onInit)
    })

    instance.consent = {
      whenReady,
      onConsentChange(cb) {
        const handler = (e: Event) => cb((e as CustomEvent).detail, e)
        window.addEventListener('UC_CONSENT', handler)
        return () => window.removeEventListener('UC_CONSENT', handler)
      },
      showFirstLayer: () => window.UC_UI?.showFirstLayer?.(),
      showSecondLayer: () => window.UC_UI?.showSecondLayer?.(),
      acceptAll: () => window.UC_UI?.acceptAllConsents?.(),
      denyAll: () => window.UC_UI?.denyAllConsents?.(),
    }
  }

  return instance
}
