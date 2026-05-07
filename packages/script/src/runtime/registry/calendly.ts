import type { RegistryScriptInput, UseScriptContext } from '#nuxt-scripts/types'
import { useHead } from '@unhead/vue'
import { useRegistryScript } from '../utils'
import { CalendlyOptions } from './schemas'

export { CalendlyOptions }

export type CalendlyInput = RegistryScriptInput<typeof CalendlyOptions, true, false>

interface CalendlyPrefill {
  name?: string
  email?: string
  firstName?: string
  lastName?: string
  customAnswers?: Record<string, string>
}

interface CalendlyUtm {
  utmCampaign?: string
  utmSource?: string
  utmMedium?: string
  utmContent?: string
  utmTerm?: string
}

interface CalendlyPageSettings {
  backgroundColor?: string
  hideEventTypeDetails?: boolean
  hideLandingPageDetails?: boolean
  primaryColor?: string
  textColor?: string
}

export interface CalendlyInlineWidgetOptions {
  url: string
  parentElement: HTMLElement | string
  prefill?: CalendlyPrefill
  utm?: CalendlyUtm
  pageSettings?: CalendlyPageSettings
}

export interface CalendlyPopupWidgetOptions {
  url: string
  rootElement?: HTMLElement
  text?: string
  color?: string
  textColor?: string
  branding?: boolean
  prefill?: CalendlyPrefill
  utm?: CalendlyUtm
  pageSettings?: CalendlyPageSettings
}

export interface CalendlyBadgeWidgetOptions {
  url: string
  text?: string
  color?: string
  textColor?: string
  branding?: boolean
  prefill?: CalendlyPrefill
  utm?: CalendlyUtm
  pageSettings?: CalendlyPageSettings
}

export interface CalendlyApi {
  Calendly: {
    initInlineWidget: (options: CalendlyInlineWidgetOptions) => void
    initPopupWidget: (options: CalendlyPopupWidgetOptions) => void
    initBadgeWidget: (options: CalendlyBadgeWidgetOptions) => void
    showPopupWidget: (url: string) => void
    closePopupWidget: () => void
    initPopupWidgetWithText: (options: CalendlyPopupWidgetOptions) => void
    q?: unknown[]
  }
}

declare global {
  interface Window extends CalendlyApi {}
}

const CALENDLY_CSS_HREF = 'https://assets.calendly.com/assets/external/widget.css'
const CALENDLY_CSS_KEY = 'nuxt-scripts-calendly-css'

let cssInjected = false

function ensureCalendlyStylesheet() {
  if (import.meta.server || cssInjected)
    return
  cssInjected = true
  useHead({
    link: [
      {
        key: CALENDLY_CSS_KEY,
        rel: 'stylesheet',
        href: CALENDLY_CSS_HREF,
      },
    ],
  })
}

/**
 * Load the Calendly widget script and expose a typed `Calendly` proxy for
 * inline, popup, and badge bookings.
 *
 * @see https://help.calendly.com/hc/en-us/articles/223147027
 */
export function useScriptCalendly<T extends CalendlyApi>(
  _options?: CalendlyInput,
): UseScriptContext<T> {
  ensureCalendlyStylesheet()

  return useRegistryScript<T, typeof CalendlyOptions>('calendly', () => ({
    scriptInput: {
      src: 'https://assets.calendly.com/assets/external/widget.js',
      crossorigin: false,
    },
    schema: import.meta.dev ? CalendlyOptions : undefined,
    scriptOptions: {
      use() {
        return { Calendly: window.Calendly }
      },
    },
    clientInit: import.meta.server
      ? undefined
      : () => {
          if (window.Calendly)
            return
          const queue: unknown[] = []
          const stub = {
            q: queue,
            initInlineWidget(...args: unknown[]) {
              queue.push(['initInlineWidget', ...args])
            },
            initPopupWidget(...args: unknown[]) {
              queue.push(['initPopupWidget', ...args])
            },
            initBadgeWidget(...args: unknown[]) {
              queue.push(['initBadgeWidget', ...args])
            },
            initPopupWidgetWithText(...args: unknown[]) {
              queue.push(['initPopupWidgetWithText', ...args])
            },
            showPopupWidget(...args: unknown[]) {
              queue.push(['showPopupWidget', ...args])
            },
            closePopupWidget(...args: unknown[]) {
              queue.push(['closePopupWidget', ...args])
            },
          } as unknown as CalendlyApi['Calendly']
          window.Calendly = stub
        },
  }), _options)
}
