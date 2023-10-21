import { withQuery } from 'ufo'
import type { ThirdPartyScriptOptions } from '../../types'
import { useHead, useScript } from '#imports'

export interface GoogleAnalyticsOptions {
  id: string
}

export interface GTag {
  (fn: 'js', opt: Date): void;
  (fn: 'config', opt: string): void;
  (fn: 'event', opt: string, opt2: { [key: string]: any }): void;
  (fn: 'set', opt: { [key: string]: string }): void;
  (fn: 'get', opt: string): void;
  (fn: 'consent', opt: 'default', opt2: { [key: string]: string }): void;
  (fn: 'consent', opt: 'update', opt2: { [key: string]: string }): void;
  (fn: 'config', opt: 'reset'): void;
}

export interface GoogleAnalyticsApi {
  dataLayer: Record<string, any>[];
  gtag: GTag;
}

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
    use: () => ({ dataLayer: window.dataLayer, gtag: window.gtag })
  })
}
