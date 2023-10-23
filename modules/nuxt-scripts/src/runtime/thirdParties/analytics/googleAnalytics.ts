import { withQuery } from 'ufo'
import type { GoogleAnalyticsApi, GoogleAnalyticsOptions } from 'third-party-capital'
import type { ThirdPartyScriptOptions } from '../../types'
import { useHead, useScript } from '#imports'

declare global {
  interface Window extends GoogleAnalyticsApi {}
}

export function useGoogleAnalytics(options: ThirdPartyScriptOptions<GoogleAnalyticsOptions, GoogleAnalyticsApi> = {}) {
  useHead({
    script: [
      {
        key: 'gtag-setup',
        innerHTML: `window.dataLayer=window.dataLayer||[];window.gtag=function gtag() {window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config', ${JSON.stringify(options.id)})`,
      },
    ],
  })
  return useScript<GoogleAnalyticsApi>({
    key: 'gtag',
    src: withQuery(`https://www.googletagmanager.com/gtag/js`, { id: options?.id }),
  }, {
    ...options,
    use: () => ({ dataLayer: window.dataLayer, gtag: window.gtag }),
  })
}
