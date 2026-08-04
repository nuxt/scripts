import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { any, array, boolean, object, optional, record, string } from 'valibot'
import { useRegistryScript } from '../utils'

const PlausibleAnalyticsOptionsSchema = object({
  scriptId: string(),
  customProperties: optional(record(string(), any())),
  endpoint: optional(string()),
  fileDownloads: optional(object({
    fileExtensions: optional(array(string())),
  })),
  hashBasedRouting: optional(boolean()),
  autoCapturePageviews: optional(boolean()),
  captureOnLocalhost: optional(boolean()),
  trackForms: optional(boolean()),
})

/**
 * Plausible Analytics options
 * @see https://plausible.io/docs/script-extensions
 */
export interface PlausibleAnalyticsOptions {
  /**
   * Unique script ID for your site.
   * Get this from your Plausible dashboard under Site Installation
   *
   * Extract it from your Plausible script URL:
   * ```
   * <script src="https://plausible.io/js/pa-gYyxvZhkMzdzXBAtSeSNz.js"></script>
   *                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^
   *                                       scriptId: 'gYyxvZhkMzdzXBAtSeSNz'
   * ```
   * @example 'gYyxvZhkMzdzXBAtSeSNz'
   */
  scriptId: string
  /** Custom properties to track with every pageview */
  customProperties?: Record<string, any>
  /** Custom tracking endpoint URL */
  endpoint?: string
  /** Configure file download tracking */
  fileDownloads?: {
    /** File extensions to track (default: pdf, xlsx, docx, txt, rtf, csv, exe, key, pps, ppt, pptx, 7z, pkg, rar, gz, zip, avi, mov, mp4, mpeg, wmv, midi, mp3, wav, wma, dmg) */
    fileExtensions?: string[]
  }
  /** Enable hash-based routing for single-page apps */
  hashBasedRouting?: boolean
  /** Set to false to manually trigger pageviews */
  autoCapturePageviews?: boolean
  /** Enable tracking on localhost */
  captureOnLocalhost?: boolean
  /** Enable form submission tracking */
  trackForms?: boolean
}

export type PlausibleAnalyticsInput = RegistryScriptInput<typeof PlausibleAnalyticsOptionsSchema, false>

/**
 * Init options for plausible.init() (October 2025 format)
 * @see https://plausible.io/docs/script-extensions
 */
export interface PlausibleInitOptions {
  customProperties?: Record<string, any>
  endpoint?: string
  fileDownloads?: {
    fileExtensions?: string[]
  }
  hashBasedRouting?: boolean
  autoCapturePageviews?: boolean
  captureOnLocalhost?: boolean
  trackForms?: boolean
}

export type PlausibleFunction = ((event: '404', options: Record<string, any>) => void)
  & ((event: 'event', options: Record<string, any>) => void)
  & ((...params: any[]) => void) & {
    q: any[]
    init: (options: PlausibleInitOptions) => void
  }

export interface PlausibleAnalyticsApi {
  plausible: PlausibleFunction
}

declare global {
  interface Window {
    plausible: PlausibleFunction
  }
}

export function useScriptPlausibleAnalytics<T extends PlausibleAnalyticsApi>(_options?: PlausibleAnalyticsInput) {
  return useRegistryScript<T, typeof PlausibleAnalyticsOptionsSchema>('plausibleAnalytics', (options) => {
    const initOptions: PlausibleInitOptions = {}
    if (options?.customProperties)
      initOptions.customProperties = options.customProperties
    if (options?.endpoint)
      initOptions.endpoint = options.endpoint
    if (options?.fileDownloads)
      initOptions.fileDownloads = options.fileDownloads
    if (options?.hashBasedRouting !== undefined)
      initOptions.hashBasedRouting = options.hashBasedRouting
    if (options?.autoCapturePageviews !== undefined)
      initOptions.autoCapturePageviews = options.autoCapturePageviews
    if (options?.captureOnLocalhost !== undefined)
      initOptions.captureOnLocalhost = options.captureOnLocalhost
    if (options?.trackForms !== undefined)
      initOptions.trackForms = options.trackForms

    return {
      scriptInput: { src: `https://plausible.io/js/pa-${options?.scriptId}.js` },
      schema: import.meta.dev ? PlausibleAnalyticsOptionsSchema : undefined,
      scriptOptions: {
        use() {
          return { plausible: window.plausible }
        },
      },
      clientInit: import.meta.server
        ? undefined
        : () => {
            const w = window as any
            w.plausible = w.plausible || function (...args: any[]) {
              (w.plausible.q = w.plausible.q || []).push(args)
            }
            w.plausible.init = w.plausible.init || function (i: PlausibleInitOptions) {
              w.plausible.o = i || {}
            }
            w.plausible.init(initOptions)
          },
    }
  }, _options)
}
