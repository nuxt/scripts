import { GoogleAnalytics } from 'third-party-capital'
import type { GoogleAnalyticsApi, GoogleAnalyticsOptions } from 'third-party-capital'
import { convertThirdPartyCapital, validateRequiredOptions } from '../util'
import type { ThirdPartyScriptApi, ThirdPartyScriptOptions } from '../types'

declare global {
  interface Window extends GoogleAnalyticsApi { }
}

/**
 * useGoogleAnalytics
 *
 * A 3P wrapper for Google Analytics that takes an options input to feed into third-party-capital({@link https://github.com/GoogleChromeLabs/third-party-capital}), which returns instructions for nuxt-scripts.
 *
 * @param options ThirdPartyScriptOptions
 * @returns ThirdPartyScriptApi
 */
export function useGoogleAnalytics(options: ThirdPartyScriptOptions<GoogleAnalyticsOptions, GoogleAnalyticsApi> = {}): ThirdPartyScriptApi<GoogleAnalyticsApi> {
  const ga = GoogleAnalytics({ id: options.id })
  validateRequiredOptions(ga.id, options, ['id'])

  // Hard-coding strategy until fallback is added to third-party-capital
  options.trigger = 'idle'
  options.skipEarlyConnections = true

  return convertThirdPartyCapital<GoogleAnalyticsOptions, GoogleAnalyticsApi>({
    data: ga,
    mainScriptKey: 'gtag',
    options,
    use: () => ({ dataLayer: window.dataLayer, gtag: window.gtag }),
  })
}
