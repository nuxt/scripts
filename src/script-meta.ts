export type TrackedDataType
  = | 'page-views' | 'events' | 'conversions' | 'user-identity'
    | 'session-replay' | 'heatmaps' | 'clicks' | 'scrolls'
    | 'retargeting' | 'audiences' | 'form-submissions'
    | 'video-engagement' | 'transactions' | 'errors'
    | 'tag-injection' | 'ab-testing'

export interface ScriptMeta {
  /** Canonical script URL(s) to fetch for size measurement */
  urls: string[]
  /** Types of data this script tracks/collects */
  trackedData: TrackedDataType[]
}

export const scriptMeta: Record<string, ScriptMeta> = {
  // Analytics
  plausibleAnalytics: {
    urls: ['https://plausible.io/js/script.js'],
    trackedData: ['page-views', 'events', 'conversions'],
  },
  cloudflareWebAnalytics: {
    urls: ['https://static.cloudflareinsights.com/beacon.min.js'],
    trackedData: ['page-views'],
  },
  postHog: {
    urls: [], // NPM-only, no CDN script
    trackedData: ['page-views', 'events', 'conversions', 'user-identity', 'session-replay', 'heatmaps', 'ab-testing'],
  },
  fathomAnalytics: {
    urls: ['https://cdn.usefathom.com/script.js'],
    trackedData: ['page-views', 'events', 'conversions'],
  },
  matomoAnalytics: {
    urls: ['https://cdn.matomo.cloud/demo.matomo.cloud/matomo.js'],
    trackedData: ['page-views', 'events', 'conversions', 'user-identity', 'heatmaps', 'ab-testing'],
  },
  rybbitAnalytics: {
    urls: ['https://app.rybbit.io/api/script.js'],
    trackedData: ['page-views', 'events'],
  },
  databuddyAnalytics: {
    urls: ['https://cdn.databuddy.cc/databuddy.js'],
    trackedData: ['page-views', 'events'],
  },
  segment: {
    urls: ['https://cdn.segment.com/analytics.js/v1/KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C/analytics.min.js'],
    trackedData: ['page-views', 'events', 'conversions', 'user-identity'],
  },
  googleAnalytics: {
    urls: ['https://www.googletagmanager.com/gtag/js?id=G-TR58L0EF8P'],
    trackedData: ['page-views', 'events', 'conversions', 'user-identity', 'audiences'],
  },
  umamiAnalytics: {
    urls: ['https://cloud.umami.is/script.js'],
    trackedData: ['page-views', 'events'],
  },

  // Ads / Pixels
  metaPixel: {
    urls: ['https://connect.facebook.net/en_US/fbevents.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
  },
  xPixel: {
    urls: ['https://static.ads-twitter.com/uwt.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
  },
  tikTokPixel: {
    urls: ['https://analytics.tiktok.com/i18n/pixel/events.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
  },
  snapchatPixel: {
    urls: ['https://sc-static.net/scevent.min.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
  },
  redditPixel: {
    urls: ['https://www.redditstatic.com/ads/pixel.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
  },
  googleAdsense: {
    urls: ['https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'],
    trackedData: ['page-views', 'retargeting', 'audiences'],
  },
  carbonAds: {
    urls: ['https://cdn.carbonads.com/carbon.js?serve=CW7DTKJL&placement=unlighthousedev&format=cover'],
    trackedData: ['page-views'],
  },

  // Session replay / Heatmaps
  hotjar: {
    urls: ['https://static.hotjar.com/c/hotjar-3925006.js?sv=6'],
    trackedData: ['page-views', 'session-replay', 'heatmaps', 'clicks', 'scrolls', 'form-submissions'],
  },
  clarity: {
    urls: ['https://www.clarity.ms/tag/mqk2m9dr2v'],
    trackedData: ['page-views', 'session-replay', 'heatmaps', 'clicks', 'scrolls'],
  },

  // Tag Manager
  googleTagManager: {
    urls: ['https://www.googletagmanager.com/gtm.js?id=GTM-MWW974PF'],
    trackedData: ['tag-injection'],
  },

  // Support
  intercom: {
    urls: ['https://widget.intercom.io/widget/akg5rmxb'],
    trackedData: ['user-identity', 'events'],
  },
  crisp: {
    urls: ['https://client.crisp.chat/l.js'],
    trackedData: ['user-identity', 'events'],
  },

  // Payments
  stripe: {
    urls: ['https://js.stripe.com/v3/'],
    trackedData: ['transactions'],
  },
  lemonSqueezy: {
    urls: ['https://assets.lemonsqueezy.com/lemon.js'],
    trackedData: ['transactions'],
  },
  payPal: {
    urls: ['https://www.paypal.com/web-sdk/v6/core'],
    trackedData: ['transactions'],
  },

  // Video
  vimeoPlayer: {
    urls: ['https://player.vimeo.com/api/player.js'],
    trackedData: ['video-engagement'],
  },
  youTubePlayer: {
    urls: ['https://www.youtube.com/iframe_api'],
    trackedData: ['video-engagement'],
  },

  // Content
  googleMaps: {
    urls: [], // Dynamic URL with API key
    trackedData: [],
  },

  // CDN
  npm: {
    urls: [], // Dynamic per package
    trackedData: [],
  },

  // Utility
  googleRecaptcha: {
    urls: ['https://www.google.com/recaptcha/api.js'],
    trackedData: [],
  },
  googleSignIn: {
    urls: ['https://accounts.google.com/gsi/client'],
    trackedData: ['user-identity'],
  },
}
