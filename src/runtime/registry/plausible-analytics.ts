import { useRegistryScript } from '../utils'
import { any, array, boolean, literal, object, optional, record, string, union } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'
import { logger } from '../logger'

// Legacy extensions (deprecated but kept for backward compatibility)
const extensions = [
  literal('hash'),
  literal('outbound-links'),
  literal('file-downloads'),
  literal('tagged-events'),
  literal('revenue'),
  literal('pageview-props'),
  literal('compat'),
  literal('local'),
  literal('manual'),
]

const PlausibleAnalyticsOptionsSchema = object({
  // New October 2025: unique script ID per site (replaces domain)
  scriptId: optional(string()),
  // Legacy: domain-based approach (deprecated)
  domain: optional(string()),
  // Legacy extension support (deprecated)
  extension: optional(union([union(extensions), array(union(extensions))])),
  // New October 2025 init options
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
   * Unique script ID for your site (recommended - new format as of October 2025)
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
  scriptId?: string
  /**
   * Your site domain
   * @deprecated Use `scriptId` instead (new October 2025 format)
   * @example 'example.com'
   */
  domain?: string
  /**
   * Script extensions for additional features
   * @deprecated Use init options like `hashBasedRouting`, `captureOnLocalhost`, etc. instead (new October 2025 format)
   */
  extension?: 'hash' | 'outbound-links' | 'file-downloads' | 'tagged-events' | 'revenue' | 'pageview-props' | 'compat' | 'local' | 'manual' | Array<'hash' | 'outbound-links' | 'file-downloads' | 'tagged-events' | 'revenue' | 'pageview-props' | 'compat' | 'local' | 'manual'>
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
    // Determine which script format to use
    const useNewScript = !!options?.scriptId
    const useLegacyScript = !!options?.extension

    // Validate: don't mix deprecated and new options
    if (import.meta.dev) {
      // Check for missing required options
      if (!useNewScript && !options?.domain) {
        logger.warn('Plausible Analytics: No `scriptId` or `domain` provided. Please provide either `scriptId` or `domain` (legacy).')
      }

      // Check for mixing new and deprecated options
      if (useNewScript && options?.domain) {
        logger.warn('Plausible Analytics: You are using both `scriptId` (new format) and `domain` (deprecated). Please use only `scriptId` for the new format.')
      }
      if (useNewScript && useLegacyScript) {
        logger.warn('Plausible Analytics: You are using both `scriptId` (new format) and `extension` (deprecated). Please use `scriptId` with init options like `hashBasedRouting`, `captureOnLocalhost`, etc. instead.')
      }
    }

    // Build script URL
    let scriptSrc: string
    if (useNewScript) {
      // New October 2025 format with unique script ID
      scriptSrc = `https://plausible.io/js/pa-${options.scriptId}.js`
    }
    else if (useLegacyScript) {
      // Legacy extension format
      const extensions = Array.isArray(options.extension) ? options.extension.join('.') : [options.extension]
      scriptSrc = `https://plausible.io/js/script.${extensions}.js`
    }
    else {
      // Legacy basic script
      scriptSrc = 'https://plausible.io/js/script.js'
    }

    // Build init options for new script format
    const initOptions: PlausibleInitOptions = {}
    if (options?.customProperties) initOptions.customProperties = options.customProperties
    if (options?.endpoint) initOptions.endpoint = options.endpoint
    if (options?.fileDownloads) initOptions.fileDownloads = options.fileDownloads
    if (options?.hashBasedRouting !== undefined) initOptions.hashBasedRouting = options.hashBasedRouting
    if (options?.autoCapturePageviews !== undefined) initOptions.autoCapturePageviews = options.autoCapturePageviews
    if (options?.captureOnLocalhost !== undefined) initOptions.captureOnLocalhost = options.captureOnLocalhost

    // Build script input
    const scriptInput = !useNewScript && options?.domain
      ? {
          'src': scriptSrc,
          'data-domain': options.domain,
        }
      : {
          src: scriptSrc,
        }

    return {
      scriptInput,
      schema: import.meta.dev ? PlausibleAnalyticsOptionsSchema : undefined,
      scriptOptions: {
        use() {
          return { plausible: window.plausible }
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
      },
    }
  }, _options)
}
