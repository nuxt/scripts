import { useHead } from '@unhead/vue'
import { useRegistryScript } from '../utils'
import { object, string, optional, boolean } from '#nuxt-scripts-validator'
import type { RegistryScriptInput } from '#nuxt-scripts/types'

export const GoogleAdsenseOptions = object({
  /**
   * The Google Adsense ID.
   */
  client: optional(string()),
  /**
   * Enable or disable Auto Ads.
   */
  autoAds: optional(boolean()),
})

export type GoogleAdsenseInput = RegistryScriptInput<typeof GoogleAdsenseOptions, true, false, false>

export interface GoogleAdsenseApi {
  /**
   * The Google Adsense API.
   */
  adsbygoogle: any[] & { loaded?: boolean }
}

declare global {
  interface Window extends GoogleAdsenseApi {}
}

/**
 * useScriptGoogleAdsense
 *
 * A 3P wrapper for Google Analytics that takes an options input to feed into third-party-capital({@link https://github.com/GoogleChromeLabs/third-party-capital}), which returns instructions for nuxt-scripts.
 */
export function useScriptGoogleAdsense<T extends GoogleAdsenseApi>(_options?: GoogleAdsenseInput) {
  // Note: inputs.useScriptInput is not usable, needs to be normalized
  return useRegistryScript<T, typeof GoogleAdsenseOptions>('googleAdsense', options => ({
    scriptInput: {
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    },
    schema: import.meta.dev ? GoogleAdsenseOptions : undefined,
    scriptOptions: {
      use() {
        return { adsbygoogle: window.adsbygoogle }
      },
      beforeInit() {
        if (options?.client) {
          useHead({
            // Add meta tag for Google Adsense account
            meta: [
              {
                name: 'google-adsense-account',
                content: options.client,
              },
            ],
            // Inject Auto Ads script dynamically
            script: [
              {
                innerHTML: `
                (adsbygoogle = window.adsbygoogle || []).push({
                  google_ad_client: "${options.client}",
                  enable_page_level_ads: ${options.autoAds ?? false}
                });
                `,
                type: 'text/javascript',
              },
            ],
          })
        }
      },
    },
  }), _options)
}
