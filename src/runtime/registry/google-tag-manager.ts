import { withQuery } from 'ufo'
import type { GTag } from './google-analytics'
import { useRegistryScript } from '#nuxt-scripts/utils'
import type { NuxtUseScriptOptions, RegistryScriptInput, UseFunctionType, UseScriptContext } from '#nuxt-scripts/types'
import { object, string, optional, boolean, union, literal } from '#nuxt-scripts-validator'

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
  (obj: Record<string, unknown>): void
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

/**
 * GTM configuration options with improved documentation
 */
export const GoogleTagManagerOptions = object({
  /** GTM container ID (format: GTM-XXXXXX) */
  id: string(),

  /** Optional dataLayer variable name */
  l: optional(string()),

  /** Authentication token for environment-specific container versions */
  auth: optional(string()),

  /** Preview environment name */
  preview: optional(string()),

  /** Forces GTM cookies to take precedence when true */
  cookiesWin: optional(union([boolean(), literal('x')])),

  /** Enables debug mode when true */
  debug: optional(union([boolean(), literal('x')])),

  /** No Personal Advertising - disables advertising features when true */
  npa: optional(union([boolean(), literal('1')])),

  /** Custom dataLayer name (alternative to "l" property) */
  dataLayer: optional(string()),

  /** Environment name for environment-specific container */
  envName: optional(string()),

  /** Referrer policy for analytics requests */
  authReferrerPolicy: optional(string()),
})

export type GoogleTagManagerInput = RegistryScriptInput<typeof GoogleTagManagerOptions>

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
): UseScriptContext<UseFunctionType<NuxtUseScriptOptions<T>, T>> {
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
        clientInit: import.meta.server
          ? undefined
          : () => {
              // Initialize dataLayer if it doesn't exist
              (window as any)[dataLayerName] = (window as any)[dataLayerName] || []

              // Create gtag function
              function gtag() {
                // Pushing arguments to dataLayer is necessary for GTM to process events
                // eslint-disable-next-line prefer-rest-params
                (window as any)[dataLayerName].push(arguments)
              }

              // Assign gtag to window for global access
              (window as any).gtag = gtag

              // Allow custom initialization
              options?.onBeforeGtmStart?.(gtag);

              // Push the standard GTM initialization event
              (window as any)[dataLayerName].push({
                'gtm.start': new Date().getTime(),
                'event': 'gtm.js',
              })
            },
      }
    },
    options,
  )
}
