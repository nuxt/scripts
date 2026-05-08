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
  hideGdprBanner?: boolean
  primaryColor?: string
  textColor?: string
}

export interface CalendlyInlineWidgetOptions {
  url: string
  parentElement: HTMLElement
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

const CALENDLY_CSS_KEY = 'nuxt-scripts-calendly-css'

const CALENDLY_CLOSE_ICON = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg width="22" height="22" xmlns="http://www.w3.org/2000/svg"><path d="M11.192 9.071l7.779-7.778a1.5 1.5 0 0 1 2.12 2.121l-7.777 7.778 7.778 7.779a1.5 1.5 0 1 1-2.121 2.12l-7.779-7.777-7.778 7.778a1.5 1.5 0 1 1-2.121-2.121l7.778-7.779-7.778-7.778a1.5 1.5 0 0 1 2.121-2.121l7.778 7.778z" fill="#FFF" fill-rule="nonzero"/></svg>',
)}`

const CALENDLY_CSS = `.calendly-badge-widget,.calendly-badge-widget *,.calendly-inline-widget,.calendly-inline-widget *,.calendly-overlay,.calendly-overlay *{font-size:16px;line-height:1.2em}.calendly-badge-widget iframe,.calendly-inline-widget iframe,.calendly-overlay iframe{display:inline;height:100%;width:100%}.calendly-popup-content{position:relative}.calendly-popup-content.calendly-mobile{-webkit-overflow-scrolling:touch;overflow-y:auto}.calendly-overlay{background-color:#a5a5a5;background-color:rgba(31,31,31,.4);bottom:0;left:0;overflow:hidden;position:fixed;right:0;top:0;z-index:9999}.calendly-overlay .calendly-close-overlay{bottom:0;left:0;position:absolute;right:0;top:0}.calendly-overlay .calendly-popup{box-sizing:border-box;height:90%;left:50%;max-height:700px!important;max-width:1000px;min-width:900px;position:absolute;top:50%;transform:translateY(-50%) translateX(-50%);width:80%}@media (max-width:975px){.calendly-overlay .calendly-popup{bottom:0;height:auto;left:0;max-height:none;min-width:0;position:fixed;right:0;top:50px;transform:none;width:100%}}.calendly-overlay .calendly-popup .calendly-popup-content{height:100%}.calendly-overlay .calendly-popup-close{background:url(${CALENDLY_CLOSE_ICON}) no-repeat;background-size:contain;color:#fff;cursor:pointer;height:19px;position:absolute;right:25px;top:25px;width:19px}@media (max-width:975px){.calendly-overlay .calendly-popup-close{right:15px;top:15px}}.calendly-badge-widget{bottom:15px;position:fixed;right:20px;z-index:9998}.calendly-badge-widget .calendly-badge-content{border-radius:25px;box-shadow:0 2px 5px rgba(0,0,0,.25);color:#fff;cursor:pointer;display:table-cell;font-family:sans-serif;font-size:14px;font-weight:700;height:45px;padding:0 30px;text-align:center;vertical-align:middle;width:auto}.calendly-badge-widget .calendly-badge-content.calendly-white{color:#666a73}.calendly-badge-widget .calendly-badge-content span{display:block;font-size:12px}.calendly-spinner{left:0;position:absolute;right:0;text-align:center;top:50%;transform:translateY(-50%);z-index:-1}.calendly-spinner>div{animation:calendly-bouncedelay 1.4s ease-in-out infinite;animation-fill-mode:both;background-color:#e1e1e1;border-radius:50%;display:inline-block;height:18px;vertical-align:middle;width:18px}.calendly-spinner .calendly-bounce1{animation-delay:-.32s}.calendly-spinner .calendly-bounce2{animation-delay:-.16s}@keyframes calendly-bouncedelay{0%,80%,to{transform:scale(0)}40%{transform:scale(1)}}`

function ensureCalendlyStylesheet() {
  if (import.meta.server)
    return
  useHead({
    style: [
      {
        key: CALENDLY_CSS_KEY,
        innerHTML: CALENDLY_CSS,
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
