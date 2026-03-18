import type { ResolvePathOptions } from '@nuxt/kit'
import type { ClarityInput } from './runtime/registry/clarity'
import type { GoogleAdsenseInput } from './runtime/registry/google-adsense'
import type { GoogleRecaptchaInput } from './runtime/registry/google-recaptcha'
import type { HotjarInput } from './runtime/registry/hotjar'
import type { IntercomInput } from './runtime/registry/intercom'
import type { MixpanelAnalyticsInput } from './runtime/registry/mixpanel-analytics'
import type { NpmInput } from './runtime/registry/npm'
import type { PlausibleAnalyticsInput } from './runtime/registry/plausible-analytics'
import type { RybbitAnalyticsInput } from './runtime/registry/rybbit-analytics'
import type { SegmentInput } from './runtime/registry/segment'
import type { TikTokPixelInput } from './runtime/registry/tiktok-pixel'
import type { RegistryScript } from './runtime/types'
import { joinURL, withBase, withQuery } from 'ufo'
import { LOGOS } from './registry-logos'

// avoid nuxt/kit dependency here so we can use in docs

export async function registry(resolve?: (path: string, opts?: ResolvePathOptions | undefined) => Promise<string>): Promise<RegistryScript[]> {
  resolve = resolve || ((s: string) => Promise.resolve(s))

  return [
    {
      registryKey: 'plausibleAnalytics',
      label: 'Plausible Analytics',
      category: 'analytics',
      scriptBundling: (options?: PlausibleAnalyticsInput) => {
        if (options?.scriptId)
          return `https://plausible.io/js/pa-${options.scriptId}.js`
        const extensions = Array.isArray(options?.extension) ? options.extension.join('.') : [options?.extension]
        return options?.extension ? `https://plausible.io/js/script.${extensions}.js` : 'https://plausible.io/js/script.js'
      },
      logo: LOGOS.plausibleAnalytics,
      import: {
        name: 'useScriptPlausibleAnalytics',
        from: await resolve('./runtime/registry/plausible-analytics'),
      },
    },
    {
      registryKey: 'cloudflareWebAnalytics',
      label: 'Cloudflare Web Analytics',
      src: 'https://static.cloudflareinsights.com/beacon.min.js',
      category: 'analytics',
      logo: LOGOS.cloudflareWebAnalytics,
      import: {
        name: 'useScriptCloudflareWebAnalytics',
        from: await resolve('./runtime/registry/cloudflare-web-analytics'),
      },
    },
    {
      registryKey: 'vercelAnalytics',
      label: 'Vercel Analytics',
      src: 'https://va.vercel-scripts.com/v1/script.js',
      category: 'analytics',
      logo: LOGOS.vercelAnalytics,
      import: {
        name: 'useScriptVercelAnalytics',
        from: await resolve('./runtime/registry/vercel-analytics'),
      },
    },
    {
      registryKey: 'posthog',
      label: 'PostHog',
      src: false,
      scriptBundling: false,
      category: 'analytics',
      logo: LOGOS.posthog,
      import: {
        name: 'useScriptPostHog',
        from: await resolve('./runtime/registry/posthog'),
      },
    },
    {
      registryKey: 'fathomAnalytics',
      label: 'Fathom Analytics',
      src: 'https://cdn.usefathom.com/script.js',
      category: 'analytics',
      logo: LOGOS.fathomAnalytics,
      import: {
        name: 'useScriptFathomAnalytics',
        from: await resolve('./runtime/registry/fathom-analytics'),
      },
    },
    {
      registryKey: 'matomoAnalytics',
      label: 'Matomo Analytics',
      scriptBundling: false, // breaks script
      category: 'analytics',
      logo: LOGOS.matomoAnalytics,
      import: {
        name: 'useScriptMatomoAnalytics',
        from: await resolve('./runtime/registry/matomo-analytics'),
      },
    },
    {
      registryKey: 'rybbitAnalytics',
      label: 'Rybbit Analytics',
      scriptBundling: (options?: RybbitAnalyticsInput) => {
        // SDK reads document.currentScript.src to derive API host, but AST rewrite
        // patches this at build time (see RYBBIT_HOST_SPLIT_RE in rewrite-ast.ts).
        // Always download from the real host — if analyticsHost is a proxy path
        // (set by auto-inject), fall back to the default.
        const host = options?.analyticsHost
        if (host && !host.startsWith('/'))
          return `${host}/script.js`
        return 'https://app.rybbit.io/api/script.js'
      },
      category: 'analytics',
      logo: LOGOS.rybbitAnalytics,
      import: {
        name: 'useScriptRybbitAnalytics',
        from: await resolve('./runtime/registry/rybbit-analytics'),
      },
    },
    {
      registryKey: 'databuddyAnalytics',
      label: 'Databuddy Analytics',
      scriptBundling: () => 'https://cdn.databuddy.cc/databuddy.js',
      category: 'analytics',
      logo: LOGOS.databuddyAnalytics,
      import: {
        name: 'useScriptDatabuddyAnalytics',
        from: await resolve('./runtime/registry/databuddy-analytics'),
      },
    },
    {
      registryKey: 'segment',
      label: 'Segment',
      scriptBundling: (options?: SegmentInput) => {
        return joinURL('https://cdn.segment.com/analytics.js/v1', options?.writeKey || '', 'analytics.min.js')
      },
      logo: LOGOS.segment,
      category: 'analytics',
      import: {
        name: 'useScriptSegment',
        from: await resolve('./runtime/registry/segment'),
      },
    },
    {
      registryKey: 'mixpanelAnalytics',
      label: 'Mixpanel',
      scriptBundling: (options?: MixpanelAnalyticsInput) => {
        if (!options?.token)
          return false
        return 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'
      },
      category: 'analytics',
      logo: LOGOS.mixpanelAnalytics,
      import: {
        name: 'useScriptMixpanelAnalytics',
        from: await resolve('./runtime/registry/mixpanel-analytics'),
      },
    },
    {
      registryKey: 'bingUet',
      label: 'Bing UET',
      src: '//bat.bing.com/bat.js',
      category: 'ad',
      logo: LOGOS.bingUet,
      import: {
        name: 'useScriptBingUet',
        from: await resolve('./runtime/registry/bing-uet'),
      },
    },
    {
      registryKey: 'metaPixel',
      label: 'Meta Pixel',
      src: 'https://connect.facebook.net/en_US/fbevents.js',
      category: 'ad',
      logo: LOGOS.metaPixel,
      import: {
        name: 'useScriptMetaPixel',
        from: await resolve('./runtime/registry/meta-pixel'),
      },
    },
    {
      registryKey: 'xPixel',
      label: 'X Pixel',
      src: 'https://static.ads-twitter.com/uwt.js',
      category: 'ad',
      logo: LOGOS.xPixel,
      import: {
        name: 'useScriptXPixel',
        from: await resolve('./runtime/registry/x-pixel'),
      },
    },
    {
      registryKey: 'tiktokPixel',
      label: 'TikTok Pixel',
      category: 'ad',
      logo: LOGOS.tiktokPixel,
      import: {
        name: 'useScriptTikTokPixel',
        from: await resolve('./runtime/registry/tiktok-pixel'),
      },
      scriptBundling(options?: TikTokPixelInput) {
        if (!options?.id)
          return false
        return withQuery('https://analytics.tiktok.com/i18n/pixel/events.js', { sdkid: options.id, lib: 'ttq' })
      },
    },
    {
      registryKey: 'snapchatPixel',
      label: 'Snapchat Pixel',
      src: 'https://sc-static.net/scevent.min.js',
      category: 'ad',
      logo: LOGOS.snapchatPixel,
      import: {
        name: 'useScriptSnapchatPixel',
        from: await resolve('./runtime/registry/snapchat-pixel'),
      },
    },
    {
      registryKey: 'redditPixel',
      label: 'Reddit Pixel',
      src: 'https://www.redditstatic.com/ads/pixel.js',
      category: 'ad',
      logo: LOGOS.redditPixel,
      import: {
        name: 'useScriptRedditPixel',
        from: await resolve('./runtime/registry/reddit-pixel'),
      },
    },
    // ad
    {
      registryKey: 'googleAdsense',
      label: 'Google Adsense',
      proxy: 'googleAnalytics',
      scriptBundling: (options?: GoogleAdsenseInput) => {
        if (!options?.client) {
          return false
        }
        return withQuery('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
          client: options?.client,
        })
      },
      category: 'ad',
      logo: LOGOS.googleAdsense,
      import: {
        name: 'useScriptGoogleAdsense',
        from: await resolve('./runtime/registry/google-adsense'),
      },
    },
    {
      registryKey: 'carbonAds',
      label: 'Carbon Ads',
      scriptBundling: false,
      category: 'ad',
      logo: LOGOS.carbonAds,
    },
    // support
    {
      registryKey: 'intercom',
      label: 'Intercom',
      scriptBundling(options?: IntercomInput) {
        if (!options?.app_id) {
          return false
        }
        return joinURL(`https://widget.intercom.io/widget`, options?.app_id || '')
      },
      logo: LOGOS.intercom,
      category: 'support',
      import: {
        name: 'useScriptIntercom',
        from: await resolve('./runtime/registry/intercom'),
      },
    },
    {
      registryKey: 'hotjar',
      label: 'Hotjar',
      scriptBundling(options?: HotjarInput) {
        if (!options?.id) {
          return false
        }
        return withQuery(`https://static.hotjar.com/c/hotjar-${options?.id || ''}.js`, {
          sv: options?.sv || '6',
        })
      },
      logo: LOGOS.hotjar,
      category: 'analytics',
      import: {
        name: 'useScriptHotjar',
        from: await resolve('./runtime/registry/hotjar'),
      },
    },
    {
      registryKey: 'clarity',
      label: 'Clarity',
      scriptBundling(options?: ClarityInput) {
        if (!options?.id) {
          return false
        }
        return `https://www.clarity.ms/tag/${options?.id}`
      },
      logo: LOGOS.clarity,
      category: 'analytics',
      import: {
        name: 'useScriptClarity',
        from: await resolve('./runtime/registry/clarity'),
      },
    },
    // payments
    {
      registryKey: 'stripe',
      label: 'Stripe',
      scriptBundling: false,
      category: 'payments',
      logo: LOGOS.stripe,
      import: {
        name: 'useScriptStripe',
        from: await resolve('./runtime/registry/stripe'),
      },
    },
    {
      registryKey: 'lemonSqueezy',
      label: 'Lemon Squeezy',
      src: false, // should not be bundled
      category: 'payments',
      logo: LOGOS.lemonSqueezy,
      import: {
        name: 'useScriptLemonSqueezy',
        from: await resolve('./runtime/registry/lemon-squeezy'),
      },
    },
    {
      registryKey: 'paypal',
      label: 'PayPal',
      src: false, // should not be bundled
      category: 'payments',
      logo: LOGOS.paypal,
      import: {
        name: 'useScriptPayPal',
        from: await resolve('./runtime/registry/paypal'),
      },
    },
    // video
    {
      registryKey: 'vimeoPlayer',
      label: 'Vimeo Player',
      category: 'video',
      logo: LOGOS.vimeoPlayer,
      import: {
        name: 'useScriptVimeoPlayer',
        from: await resolve('./runtime/registry/vimeo-player'),
      },
    },
    {
      registryKey: 'youtubePlayer',
      label: 'YouTube Player',
      category: 'video',
      logo: LOGOS.youtubePlayer,
      import: {
        name: 'useScriptYouTubePlayer',
        from: await resolve('./runtime/registry/youtube-player'),
      },
    },
    {
      registryKey: 'googleMaps',
      label: 'Google Maps',
      category: 'content',
      logo: LOGOS.googleMaps,
      import: {
        name: 'useScriptGoogleMaps',
        from: await resolve('./runtime/registry/google-maps'),
      },
      serverHandlers: [
        { route: '/_scripts/proxy/google-static-maps', handler: await resolve('./runtime/server/google-static-maps-proxy') },
        { route: '/_scripts/proxy/google-maps-geocode', handler: await resolve('./runtime/server/google-maps-geocode-proxy') },
      ],
    },
    {
      registryKey: 'blueskyEmbed',
      label: 'Bluesky Embed',
      category: 'content',
      logo: LOGOS.blueskyEmbed,
      serverHandlers: [
        { route: '/_scripts/embed/bluesky', handler: await resolve('./runtime/server/bluesky-embed') },
        { route: '/_scripts/embed/bluesky-image', handler: await resolve('./runtime/server/bluesky-embed-image') },
      ],
    },
    {
      registryKey: 'instagramEmbed',
      label: 'Instagram Embed',
      category: 'content',
      logo: LOGOS.instagramEmbed,
      serverHandlers: [
        { route: '/_scripts/embed/instagram', handler: await resolve('./runtime/server/instagram-embed') },
        { route: '/_scripts/embed/instagram-image', handler: await resolve('./runtime/server/instagram-embed-image') },
        { route: '/_scripts/embed/instagram-asset', handler: await resolve('./runtime/server/instagram-embed-asset') },
      ],
    },
    {
      registryKey: 'xEmbed',
      label: 'X Embed',
      category: 'content',
      logo: LOGOS.xEmbed,
      serverHandlers: [
        { route: '/_scripts/embed/x', handler: await resolve('./runtime/server/x-embed') },
        { route: '/_scripts/embed/x-image', handler: await resolve('./runtime/server/x-embed-image') },
      ],
    },
    // chat
    {
      registryKey: 'crisp',
      label: 'Crisp',
      category: 'support',
      logo: LOGOS.crisp,
      import: {
        name: 'useScriptCrisp',
        from: await resolve('./runtime/registry/crisp'),
      },
    },
    // cdn
    {
      registryKey: 'npm',
      label: 'NPM',
      scriptBundling(options?: NpmInput) {
        return withBase(options?.file || '', `https://unpkg.com/${options?.packageName || ''}@${options?.version || 'latest'}`)
      },
      logo: LOGOS.npm,
      category: 'cdn',
      import: {
        name: 'useScriptNpm',
        // key is based on package name
        from: await resolve('./runtime/registry/npm'),
      },
    },
    {
      registryKey: 'googleRecaptcha',
      label: 'Google reCAPTCHA',
      category: 'utility',
      logo: LOGOS.googleRecaptcha,
      import: {
        name: 'useScriptGoogleRecaptcha',
        from: await resolve('./runtime/registry/google-recaptcha'),
      },
      scriptBundling(options?: GoogleRecaptchaInput) {
        if (!options?.siteKey) {
          return false
        }
        const baseUrl = options?.recaptchaNet
          ? 'https://www.recaptcha.net/recaptcha'
          : 'https://www.google.com/recaptcha'
        return `${baseUrl}/${options?.enterprise ? 'enterprise.js' : 'api.js'}`
      },
    },
    {
      registryKey: 'googleSignIn',
      label: 'Google Sign-In',
      src: 'https://accounts.google.com/gsi/client',
      scriptBundling: false, // CORS prevents bundling
      category: 'utility',
      logo: LOGOS.googleSignIn,
      import: {
        name: 'useScriptGoogleSignIn',
        from: await resolve('./runtime/registry/google-sign-in'),
      },
    },
    {
      registryKey: 'googleTagManager',
      label: 'Google Tag Manager',
      category: 'tag-manager',
      import: {
        name: 'useScriptGoogleTagManager',
        from: await resolve('./runtime/registry/google-tag-manager'),
      },
      logo: LOGOS.googleTagManager,
      scriptBundling(options) {
        if (!options?.id) {
          return false
        }
        return withQuery('https://www.googletagmanager.com/gtm.js', {
          id: options.id,
          l: options.l,
          gtm_auth: options.auth,
          gtm_preview: options.preview,
          gtm_cookies_win: options.cookiesWin ? 'x' : undefined,
          gtm_debug: options.debug ? 'x' : undefined,
          gtm_npa: options.npa ? '1' : undefined,
          gtm_data_layer: options.dataLayer,
          gtm_env: options.envName,
          gtm_auth_referrer_policy: options.authReferrerPolicy,
        })
      },
    },
    {
      registryKey: 'googleAnalytics',
      label: 'Google Analytics',
      category: 'analytics',
      import: {
        name: 'useScriptGoogleAnalytics',
        from: await resolve('./runtime/registry/google-analytics'),
      },
      logo: LOGOS.googleAnalytics,
      scriptBundling(options) {
        if (!options?.id) {
          return false
        }
        return withQuery('https://www.googletagmanager.com/gtag/js', { id: options?.id, l: options?.l })
      },
    },
    {
      registryKey: 'umamiAnalytics',
      label: 'Umami Analytics',
      scriptBundling: () => 'https://cloud.umami.is/script.js',
      category: 'analytics',
      logo: LOGOS.umamiAnalytics,
      import: {
        name: 'useScriptUmamiAnalytics',
        from: await resolve('./runtime/registry/umami-analytics'),
      },
    },
    {
      registryKey: 'gravatar',
      label: 'Gravatar',
      src: 'https://secure.gravatar.com/js/gprofiles.js',
      category: 'utility',
      logo: LOGOS.gravatar,
      import: {
        name: 'useScriptGravatar',
        from: await resolve('./runtime/registry/gravatar'),
      },
      serverHandlers: [
        { route: '/_scripts/proxy/gravatar', handler: await resolve('./runtime/server/gravatar-proxy') },
      ],
    },
  ]
}
