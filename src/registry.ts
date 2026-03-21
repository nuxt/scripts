import type { ResolvePathOptions } from '@nuxt/kit'
import type { ClarityInput } from './runtime/registry/clarity'
import type { GoogleAdsenseInput } from './runtime/registry/google-adsense'
import type { HotjarInput } from './runtime/registry/hotjar'
import type { IntercomInput } from './runtime/registry/intercom'
import type { MixpanelAnalyticsInput } from './runtime/registry/mixpanel-analytics'
import type { NpmInput } from './runtime/registry/npm'
import type { PlausibleAnalyticsInput } from './runtime/registry/plausible-analytics'
import type { RybbitAnalyticsInput } from './runtime/registry/rybbit-analytics'
import type { SegmentInput } from './runtime/registry/segment'
import type { TikTokPixelInput } from './runtime/registry/tiktok-pixel'
import type { ProxyPrivacyInput } from './runtime/server/utils/privacy'
import type { RegistryScript, ScriptCapabilities } from './runtime/types'
import { joinURL, withBase, withQuery } from 'ufo'
import { LOGOS } from './registry-logos'

// avoid nuxt/kit dependency here so we can use in docs

// Privacy presets — 4 profiles cover all proxy-enabled scripts
export const PRIVACY_NONE: ProxyPrivacyInput = { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false }
export const PRIVACY_FULL: ProxyPrivacyInput = { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true }
export const PRIVACY_HEATMAP: ProxyPrivacyInput = { ip: true, userAgent: false, language: true, screen: false, timezone: false, hardware: true }
export const PRIVACY_IP_ONLY: ProxyPrivacyInput = { ip: true, userAgent: false, language: false, screen: false, timezone: false, hardware: false }

// SDK-specific regex patterns used in postProcess functions
const FATHOM_SELF_HOSTED_RE = /\.src\.indexOf\("cdn\.usefathom\.com"\)\s*<\s*0/
const RYBBIT_HOST_SPLIT_RE = /\w+\.split\(["']\/script\.js["']\)\[0\]/g

// Common capability presets for registry scripts.
// partytown: true only for scripts with known PARTYTOWN_FORWARDS in module.ts.
const CAP_FULL_PT: ScriptCapabilities = { bundle: true, reverseProxyIntercept: true, partytown: true }
const CAP_FULL: ScriptCapabilities = { bundle: true, reverseProxyIntercept: true }
const CAP_BUNDLE_PT: ScriptCapabilities = { bundle: true, partytown: true }
const CAP_BUNDLE: ScriptCapabilities = { bundle: true }
const CAP_PROXY: ScriptCapabilities = { reverseProxyIntercept: true }
const DEF_FULL: ScriptCapabilities = { bundle: true, reverseProxyIntercept: true }
const DEF_BUNDLE: ScriptCapabilities = { bundle: true }
const DEF_PROXY: ScriptCapabilities = { reverseProxyIntercept: true }

export async function registry(resolve?: (path: string, opts?: ResolvePathOptions | undefined) => Promise<string>): Promise<RegistryScript[]> {
  resolve = resolve || ((s: string) => Promise.resolve(s))

  return [
    {
      registryKey: 'plausibleAnalytics',
      label: 'Plausible Analytics',
      category: 'analytics',
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['plausible.io'],
      privacy: PRIVACY_NONE,
      autoInject: { configField: 'endpoint', computeValue: proxyPrefix => `${proxyPrefix}/plausible.io/api/event` },
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['static.cloudflareinsights.com', 'cloudflareinsights.com'],
      privacy: PRIVACY_NONE,
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
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      domains: ['va.vercel-scripts.com'],
      privacy: PRIVACY_NONE,
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
      capabilities: CAP_PROXY,
      defaultCapability: DEF_PROXY,
      domains: ['us-assets.i.posthog.com', 'us.i.posthog.com', 'eu-assets.i.posthog.com', 'eu.i.posthog.com'],
      privacy: PRIVACY_NONE,
      autoInject: {
        configField: 'apiHost',
        computeValue: (proxyPrefix, config) => {
          const region = config.region || 'us'
          const host = region === 'eu' ? 'eu.i.posthog.com' : 'us.i.posthog.com'
          return `${proxyPrefix}/${host}`
        },
      },
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['cdn.usefathom.com'],
      privacy: PRIVACY_NONE,
      postProcess(output) { return output.replace(FATHOM_SELF_HOSTED_RE, '.src.indexOf("cdn.usefathom.com")<-1') },
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['cdn.matomo.cloud'],
      privacy: PRIVACY_NONE,
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
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      domains: ['app.rybbit.io'],
      privacy: PRIVACY_NONE,
      autoInject: { configField: 'analyticsHost', computeValue: proxyPrefix => `${proxyPrefix}/app.rybbit.io/api` },
      postProcess(output, rewrites) {
        const rybbitRewrite = rewrites.find(r => r.from === 'app.rybbit.io')
        if (rybbitRewrite)
          output = output.replace(RYBBIT_HOST_SPLIT_RE, `self.location.origin+"${rybbitRewrite.to}/api"`)
        return output
      },
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
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      domains: ['cdn.databuddy.cc', 'basket.databuddy.cc'],
      privacy: PRIVACY_NONE,
      autoInject: { configField: 'apiUrl', computeValue: proxyPrefix => `${proxyPrefix}/basket.databuddy.cc` },
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
      capabilities: CAP_BUNDLE_PT, // reverseProxyIntercept fails: SDK constructs API URLs dynamically
      defaultCapability: DEF_BUNDLE,
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
      capabilities: CAP_BUNDLE_PT,
      defaultCapability: DEF_BUNDLE,
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
      src: 'https://bat.bing.com/bat.js',
      capabilities: CAP_BUNDLE_PT,
      defaultCapability: DEF_BUNDLE,
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['connect.facebook.net', 'www.facebook.com', 'facebook.com', 'pixel.facebook.com'],
      privacy: PRIVACY_FULL,
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['analytics.twitter.com', 'static.ads-twitter.com', 't.co'],
      privacy: PRIVACY_FULL,
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['analytics.tiktok.com'],
      privacy: PRIVACY_FULL,
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['sc-static.net', 'tr.snapchat.com', 'pixel.tapad.com'],
      privacy: PRIVACY_FULL,
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['www.redditstatic.com', 'alb.reddit.com', 'pixel-config.reddit.com'],
      privacy: PRIVACY_FULL,
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
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      proxyConfig: 'googleAnalytics', // shares GA's domains/privacy
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
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      domains: ['cdn.carbonads.com'],
      privacy: PRIVACY_NONE,
      category: 'ad',
      logo: LOGOS.carbonAds,
    },
    // support
    {
      registryKey: 'intercom',
      label: 'Intercom',
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      domains: ['widget.intercom.io', 'api-iam.intercom.io', 'api-iam.eu.intercom.io', 'api-iam.au.intercom.io', 'js.intercomcdn.com', 'downloads.intercomcdn.com', 'video-messages.intercomcdn.com'],
      privacy: PRIVACY_IP_ONLY,
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
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      domains: ['static.hotjar.com', 'script.hotjar.com', 'vars.hotjar.com', 'in.hotjar.com', 'vc.hotjar.com', 'vc.hotjar.io', 'metrics.hotjar.io', 'insights.hotjar.com', 'ask.hotjar.io', 'events.hotjar.io', 'identify.hotjar.com', 'surveystats.hotjar.io'],
      privacy: PRIVACY_HEATMAP,
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['www.clarity.ms', 'scripts.clarity.ms', 'd.clarity.ms', 'e.clarity.ms', 'k.clarity.ms'],
      privacy: PRIVACY_HEATMAP,
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
      scriptBundling: false, // needs fingerprinting for fraud detection
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
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      domains: ['assets.lemonsqueezy.com'],
      privacy: PRIVACY_NONE,
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
      src: false, // needs fingerprinting for fraud detection
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
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      domains: ['player.vimeo.com'],
      privacy: PRIVACY_IP_ONLY,
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
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      domains: ['www.youtube.com'],
      privacy: PRIVACY_IP_ONLY,
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
      capabilities: CAP_BUNDLE, // reverseProxyIntercept fails: SDK loads secondary scripts at runtime
      defaultCapability: DEF_BUNDLE,
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
      scriptBundling: false, // needs fingerprinting for bot detection
      category: 'utility',
      logo: LOGOS.googleRecaptcha,
      import: {
        name: 'useScriptGoogleRecaptcha',
        from: await resolve('./runtime/registry/google-recaptcha'),
      },
    },
    {
      registryKey: 'googleSignIn',
      label: 'Google Sign-In',
      src: 'https://accounts.google.com/gsi/client',
      scriptBundling: false, // CORS prevents bundling, needs fingerprinting for auth
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
      capabilities: CAP_BUNDLE, // reverseProxyIntercept fails: GTM dynamically loads scripts at runtime
      defaultCapability: DEF_BUNDLE,
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['www.google-analytics.com', 'analytics.google.com', 'stats.g.doubleclick.net', 'pagead2.googlesyndication.com', 'www.googleadservices.com', 'googleads.g.doubleclick.net'],
      privacy: PRIVACY_HEATMAP,
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
      capabilities: CAP_FULL_PT,
      defaultCapability: DEF_FULL,
      domains: ['cloud.umami.is', 'api-gateway.umami.dev'],
      privacy: PRIVACY_NONE,
      autoInject: { configField: 'hostUrl', computeValue: proxyPrefix => `${proxyPrefix}/cloud.umami.is` },
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
      capabilities: CAP_FULL,
      defaultCapability: DEF_FULL,
      domains: ['secure.gravatar.com', 'gravatar.com'],
      privacy: PRIVACY_IP_ONLY,
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
