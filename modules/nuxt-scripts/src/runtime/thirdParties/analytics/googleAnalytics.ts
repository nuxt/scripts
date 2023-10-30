import type { GoogleAnalyticsApi, GoogleAnalyticsOptions } from 'third-party-capital'
import { GoogleAnalytics } from 'third-party-capital'
import type { ThirdPartyScriptApi, ThirdPartyScriptOptions } from '../../types'
import { convertThirdPartyCapital } from '../util'

declare global {
  interface Window extends GoogleAnalyticsApi { }
}

export function useGoogleAnalytics(options: ThirdPartyScriptOptions<GoogleAnalyticsOptions, GoogleAnalyticsApi> = {}): ThirdPartyScriptApi<GoogleAnalyticsApi> {
  return convertThirdPartyCapital<GoogleAnalyticsApi>({
    data: GoogleAnalytics({ id: options.id }),
    mainScriptKey: 'gtag',
    options,
    use: () => ({ dataLayer: window.dataLayer, gtag: window.gtag }),
  })
}
