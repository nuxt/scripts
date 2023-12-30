import { GoogleAnalytics } from 'third-party-capital'
import type { GoogleAnalyticsApi, GoogleAnalyticsOptions } from 'third-party-capital'
import { convertThirdPartyCapital, validateRequiredOptions } from '../util'
import type { ThirdPartyScriptApi, ThirdPartyScriptOptions } from '../types'

declare global {
  interface Window extends GoogleAnalyticsApi { }
}

export function useGoogleAnalytics(options: ThirdPartyScriptOptions<GoogleAnalyticsOptions, GoogleAnalyticsApi> = {}): ThirdPartyScriptApi<GoogleAnalyticsApi> {
  const ga = GoogleAnalytics({ id: options.id })
  validateRequiredOptions(ga.id, options, ['id'])

  // Setting here to ensure it overwrites whatever user might set.
  options.trigger = 'idle'
  options.skipEarlyConnections = true

  return convertThirdPartyCapital<GoogleAnalyticsOptions, GoogleAnalyticsApi>({
    data: ga,
    mainScriptKey: 'gtag',
    options,
    use: () => ({ dataLayer: window.dataLayer, gtag: window.gtag }),
  })
}
