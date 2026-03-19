import type { BuiltInRegistryScriptKey } from './runtime/types'

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
  /** Test ID for scripts that need an external ID to fully initialize (pixel ID, site ID, etc.) */
  testId?: string | number
}

export const scriptMeta = {
  // Analytics
  plausibleAnalytics: {
    urls: ['https://plausible.io/js/script.js'],
    trackedData: ['page-views', 'events', 'conversions'],
  },
  cloudflareWebAnalytics: {
    urls: ['https://static.cloudflareinsights.com/beacon.min.js'],
    trackedData: ['page-views'],
  },
  posthog: {
    urls: ['https://us-assets.i.posthog.com/static/array.js'],
    trackedData: ['page-views', 'events', 'conversions', 'user-identity', 'session-replay', 'heatmaps', 'ab-testing'],
    testId: 'phc_test',
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
  mixpanelAnalytics: {
    urls: ['https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'],
    trackedData: ['page-views', 'events', 'conversions', 'user-identity'],
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
  vercelAnalytics: {
    urls: ['https://va.vercel-scripts.com/v1/script.js'],
    trackedData: ['page-views', 'events'],
  },

  // Ads / Pixels
  bingUet: {
    urls: ['https://bat.bing.com/bat.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
    testId: '247021147',
  },
  metaPixel: {
    urls: ['https://connect.facebook.net/en_US/fbevents.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
    testId: '3925006',
  },
  xPixel: {
    urls: ['https://static.ads-twitter.com/uwt.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
    testId: 'ol7lz',
  },
  tiktokPixel: {
    urls: ['https://analytics.tiktok.com/i18n/pixel/events.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
    testId: 'C5ABC1234F5678',
  },
  snapchatPixel: {
    urls: ['https://sc-static.net/scevent.min.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
    testId: '2295cbcc-cb3f-4727-8c09-1133b742722c',
  },
  redditPixel: {
    urls: ['https://www.redditstatic.com/ads/pixel.js'],
    trackedData: ['page-views', 'conversions', 'retargeting', 'audiences'],
    testId: 'a2_ilz4u0kbdr3v',
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
    testId: 3925006,
  },
  clarity: {
    urls: ['https://www.clarity.ms/tag/mqk2m9dr2v'],
    trackedData: ['page-views', 'session-replay', 'heatmaps', 'clicks', 'scrolls'],
    testId: 'mqk2m9dr2v',
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
    testId: 'akg5rmxb',
  },
  crisp: {
    urls: ['https://client.crisp.chat/l.js'],
    trackedData: ['user-identity', 'events'],
    testId: 'b1021910-7ace-425a-9ef5-07f49e5ce417',
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
  paypal: {
    urls: ['https://www.paypal.com/web-sdk/v6/core'],
    trackedData: ['transactions'],
  },

  // Video
  vimeoPlayer: {
    urls: ['https://player.vimeo.com/api/player.js'],
    trackedData: ['video-engagement'],
  },
  youtubePlayer: {
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

  // Embeds
  blueskyEmbed: {
    urls: [],
    trackedData: [],
  },
  instagramEmbed: {
    urls: ['https://www.instagram.com/embed.js'],
    trackedData: [],
  },
  xEmbed: {
    urls: ['https://platform.twitter.com/widgets.js'],
    trackedData: [],
  },

  // Identity
  gravatar: {
    urls: ['https://secure.gravatar.com/js/gprofiles.js'],
    trackedData: [],
  },
} satisfies Record<BuiltInRegistryScriptKey, ScriptMeta>
