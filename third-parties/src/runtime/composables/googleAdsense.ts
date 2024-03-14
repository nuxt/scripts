import { withQuery } from 'ufo'
import type { ThirdPartyScriptOptions } from '../types'
import { useScript } from '#imports'

export interface GoogleAdsenseOptions {
  id: string
}

export interface GoogleAdsenseApi {
  adsbygoogle: {
    push: (opt: { [key: string]: string }) => void
  }
}

declare global {
  interface Window extends GoogleAdsenseApi {}
}

export function useGoogleAdsense(options: ThirdPartyScriptOptions<GoogleAdsenseOptions, GoogleAdsenseApi> = {}) {
  return useScript({
    key: 'adsbygoogle',
    defer: true,
    crossorigin: 'anonymous',
    src: withQuery(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js`, { client: options.id }),
  }, {
    use: () => window.adsbygoogle,
  })
}
