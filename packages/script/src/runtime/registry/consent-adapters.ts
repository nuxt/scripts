import type { ConsentAdapter } from '../types'
import type { BingUetApi } from './bing-uet'
import type { ClarityApi } from './clarity'
import type { ConsentOptions, GoogleAnalyticsApi } from './google-analytics'
import type { MetaPixelApi } from './meta-pixel'
import type { TikTokPixelApi } from './tiktok-pixel'

// Pure adapter definitions. Import from this file only via `import type` chains
// or top-level build code (registry.ts). No runtime imports, so pulling this in
// does not drag `nuxt/app` or other runtime utilities into module evaluation.

function applyTikTokConsent(state: { ad_storage?: 'granted' | 'denied' }, proxy: TikTokPixelApi) {
  if (!state.ad_storage)
    return
  if (state.ad_storage === 'granted')
    proxy.ttq.grantConsent()
  else
    proxy.ttq.revokeConsent()
}

/**
 * GCMv2 to TikTok consent adapter. TikTok only exposes a binary ad-storage toggle,
 * so we project lossy from `ad_storage`.
 */
export const tiktokPixelConsentAdapter: ConsentAdapter<TikTokPixelApi> = {
  applyDefault: applyTikTokConsent,
  applyUpdate: applyTikTokConsent,
}

function applyMetaConsent(state: { ad_storage?: 'granted' | 'denied' }, proxy: MetaPixelApi) {
  if (!state.ad_storage)
    return
  proxy.fbq('consent', state.ad_storage === 'granted' ? 'grant' : 'revoke')
}

/**
 * GCMv2 to Meta Pixel consent adapter. Meta only exposes a binary consent toggle,
 * projected lossy from `ad_storage`.
 */
export const metaPixelConsentAdapter: ConsentAdapter<MetaPixelApi> = {
  applyDefault: applyMetaConsent,
  applyUpdate: applyMetaConsent,
}

/**
 * GCMv2 to Google Analytics consent adapter. GA consumes GCMv2 natively; this is
 * a pass-through of the full state.
 */
export const googleAnalyticsConsentAdapter: ConsentAdapter<GoogleAnalyticsApi> = {
  applyDefault(state, proxy) {
    proxy.gtag('consent', 'default', state as ConsentOptions)
  },
  applyUpdate(state, proxy) {
    proxy.gtag('consent', 'update', state as ConsentOptions)
  },
}

/**
 * GCMv2 to Bing UET consent adapter. UET honours only `ad_storage`.
 */
export const bingUetConsentAdapter: ConsentAdapter<BingUetApi> = {
  applyDefault(state, proxy) {
    if (!state.ad_storage)
      return
    proxy.uetq.push('consent', 'default', { ad_storage: state.ad_storage })
  },
  applyUpdate(state, proxy) {
    if (!state.ad_storage)
      return
    proxy.uetq.push('consent', 'update', { ad_storage: state.ad_storage })
  },
}

/**
 * GCMv2 to Clarity consent adapter. Clarity accepts a boolean cookie toggle;
 * projected lossy from `analytics_storage`.
 */
export const clarityConsentAdapter: ConsentAdapter<ClarityApi> = {
  applyDefault(state, proxy) {
    if (!state.analytics_storage)
      return
    proxy.clarity('consent', state.analytics_storage === 'granted')
  },
  applyUpdate(state, proxy) {
    if (!state.analytics_storage)
      return
    proxy.clarity('consent', state.analytics_storage === 'granted')
  },
}
