import { defineThirdPartyScript } from '../util'
import type { ThirdPartyScriptOptions } from '../types'
import { useServerHead } from '#imports'

export interface GoogleAnalyticsOptions {
  id: string
}

export interface GoogleAnalyticsApi {
  gtag: ((fn: 'js', opt: Date) => void) |
  ((fn: 'config', opt: string) => void) |
  ((fn: 'event', opt: string, opt2: { [key: string]: string }) => void) |
  ((fn: 'set', opt: { [key: string]: string }) => void) |
  ((fn: 'get', opt: string) => void) |
  ((fn: 'consent', opt: 'default', opt2: { [key: string]: string }) => void) |
  ((fn: 'consent', opt: 'update', opt2: { [key: string]: string }) => void) |
  ((fn: 'consent', opt: 'reset') => void)
}

declare global {
  interface Window {
    gtag: GoogleAnalyticsApi
  }
}

export const GoogleAnalytics = defineThirdPartyScript<GoogleAnalyticsOptions, GoogleAnalyticsApi>({
  setup(options) {
    // TODO check SPA
    useServerHead({
      script: [
        {
          key: 'gtag-setup',
          innerHTML: `window.dataLayer=window.dataLayer||[];window.gtag=function gtag() {window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config', ${JSON.stringify(options.id)})`,
        },
      ],
    })
    // TODO handle worker
    return {
      key: 'gtag',
      use: () => { gtag: window.gtag },
      script: {
        src: `https://www.googletagmanager.com/gtag/js?id=${options.id}`,
      },
    }
  },
})

export function useGoogleAnalytics(options?: GoogleAnalyticsOptions, scriptOptions?: ThirdPartyScriptOptions) {
  // TODO reactivity
  return GoogleAnalytics(options, scriptOptions)
}
