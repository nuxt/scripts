import type { ConsentState, NuxtUseScriptOptions, RegistryScriptInput, UseFunctionType, UseScriptContext } from '#nuxt-scripts/types'
import type { GcmConsentApi } from './_gcm-consent'
import type { GTag } from './google-analytics'
import { withQuery } from 'ufo'
import { useRegistryScript } from '#nuxt-scripts/utils'
import { GoogleTagManagerOptions } from './schemas'

/**
 * Improved DataLayer type that better reflects GTM's capabilities
 * Can contain either gtag event parameters or custom data objects
 */
export type DataLayerItem = Parameters<GTag> | Record<string, unknown>
export type DataLayer = Array<DataLayerItem>

/**
 * DataLayer push function type
 */
export interface DataLayerPush {
  (...args: Parameters<GTag>): void
  (obj: Record<string, unknown> | any[]): void
}

/**
 * Improved DataLayer API type with more precise methods
 */
export interface GoogleTagManagerDataLayerApi {
  name: string
  push: DataLayerPush
  set: (config: Record<string, unknown>) => void
  get: <T = unknown>(key: string) => T
  reset: () => void
  listeners: Array<() => void>
}

/**
 * DataLayer status information
 */
export interface GoogleTagManagerDataLayerStatus {
  dataLayer: {
    gtmDom: boolean
    gtmLoad: boolean
    subscribers: number
    [key: string]: unknown
  }
}

/**
 * Container instance type
 */
export interface GoogleTagManagerContainer {
  callback: () => void
  dataLayer: GoogleTagManagerDataLayerApi
  state: Record<string, unknown>
}

/**
 * Complete GTM instance object
 */
export interface GoogleTagManagerInstance extends GoogleTagManagerDataLayerStatus {
  [containerId: string]: GoogleTagManagerContainer | any
}

/**
 * Complete Google Tag Manager API accessible via window
 */
export interface GoogleTagManagerApi {
  google_tag_manager: GoogleTagManagerInstance
  dataLayer: DataLayer & {
    push: DataLayerPush
  }
}

/**
 * Enhanced window type with GTM
 */
declare global {
  interface Window extends GoogleTagManagerApi {}
}

export { GoogleTagManagerOptions }

export type GoogleTagManagerInput = RegistryScriptInput<typeof GoogleTagManagerOptions>

/** @deprecated Use {@link GcmConsentApi} from `#nuxt-scripts/types` instead. */
export type GoogleTagManagerConsent = GcmConsentApi

/**
 * Hook to use Google Tag Manager in Nuxt applications
 */
export function useScriptGoogleTagManager<T extends GoogleTagManagerApi>(
  options?: GoogleTagManagerInput & {
    /**
     * Optional callback that runs before GTM starts
     * Allows for custom initialization or configuration
     */
    onBeforeGtmStart?: (gtag: DataLayerPush) => void
  },
): UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>, GcmConsentApi> {
  return useRegistryScript<T, typeof GoogleTagManagerOptions>(
    options?.key || 'googleTagManager',
    (opts) => {
      const dataLayerName = opts?.l ?? opts?.dataLayer ?? 'dataLayer'

      return {
        scriptInput: {
          src: withQuery('https://www.googletagmanager.com/gtm.js', {
            id: opts.id,
            l: opts.l,
            gtm_auth: opts.auth,
            gtm_preview: opts.preview,
            gtm_cookies_win: opts.cookiesWin ? 'x' : undefined,
            gtm_debug: opts.debug ? 'x' : undefined,
            gtm_npa: opts.npa ? '1' : undefined,
            gtm_data_layer: opts.dataLayer,
            gtm_env: opts.envName,
            gtm_auth_referrer_policy: opts.authReferrerPolicy,
          }),
        },
        schema: import.meta.dev ? GoogleTagManagerOptions : undefined,
        scriptOptions: {
          use: () => {
            return {
              dataLayer: (window as any)[dataLayerName] as DataLayer & { push: DataLayerPush },
              google_tag_manager: window.google_tag_manager,
            }
          },
        },
        gcmConsent: {
          // Match the gtag.js contract: enqueue an `Arguments` object, not a plain Array,
          // so GTM/Tag Assistant/Analytics Debugger recognise the consent command. See #770/#771.
          push: (_proxy: any, action: 'default' | 'update', state: ConsentState) => {
            const dl = (window as any)[dataLayerName] = (window as any)[dataLayerName] || []
            ;(function (..._args: any[]) {
              // eslint-disable-next-line prefer-rest-params
              dl.push(arguments)
            })('consent', action, state)
          },
        },
        clientInit: import.meta.server
          ? undefined
          : () => {
              // Initialize dataLayer if it doesn't exist
              (window as any)[dataLayerName] = (window as any)[dataLayerName] || []

              // Create gtag function (must push the real `arguments` object —
              // not a spread array — so GTM processes consent and
              // other commands like the official snippet)
              function gtag(..._args: any[]) {
                // Rest params satisfy TypeScript call sites; gtm expects `arguments` on the queue.
                // eslint-disable-next-line prefer-rest-params
                (window as any)[dataLayerName].push(arguments)
              }

              // Assign gtag to window for global access
              (window as any).gtag = gtag

              // Set consent defaults before any user-callback gtag/dataLayer pushes,
              // so custom events in onBeforeGtmStart honor the configured consent state.
              if (opts.defaultConsent) {
                const entries = Array.isArray(opts.defaultConsent)
                  ? opts.defaultConsent
                  : [opts.defaultConsent]
                for (const entry of entries)
                  gtag('consent', 'default', entry)
              }

              // Allow custom initialization
              options?.onBeforeGtmStart?.(gtag)

              // Push the standard GTM initialization event
              ;(window as any)[dataLayerName].push({
                'gtm.start': Date.now(),
                'event': 'gtm.js',
              })
            },
      }
    },
    options,
  ) as UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>, GcmConsentApi>
}
