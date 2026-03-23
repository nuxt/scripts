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
import type { RegistryScript, RegistryScriptKey, RegistryScriptServerHandler, ScriptCapabilities } from './runtime/types'
import { joinURL, withBase, withQuery } from 'ufo'
import { LOGOS } from './registry-logos'
import {
  BingUetOptions,
  BlueskyEmbedOptions,
  ClarityOptions,
  CloudflareWebAnalyticsOptions,
  CrispOptions,
  DatabuddyAnalyticsOptions,
  FathomAnalyticsOptions,
  GoogleAdsenseOptions,
  GoogleAnalyticsOptions,
  GoogleMapsOptions,
  GoogleRecaptchaOptions,
  GoogleSignInOptions,
  GoogleTagManagerOptions,
  GravatarOptions,
  HotjarOptions,
  InstagramEmbedOptions,
  IntercomOptions,
  MatomoAnalyticsOptions,
  MetaPixelOptions,
  MixpanelAnalyticsOptions,
  NpmOptions,
  PostHogOptions,
  RedditPixelOptions,
  RybbitAnalyticsOptions,
  SegmentOptions,
  SnapTrPixelOptions,
  StripeOptions,
  TikTokPixelOptions,
  UmamiAnalyticsOptions,
  VercelAnalyticsOptions,
  XEmbedOptions,
  XPixelOptions,
} from './runtime/registry/schemas'

// avoid nuxt/kit dependency here so we can use in docs

// Privacy presets — 4 profiles cover all proxy-enabled scripts
export const PRIVACY_NONE: ProxyPrivacyInput = { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false }
export const PRIVACY_FULL: ProxyPrivacyInput = { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true }
export const PRIVACY_HEATMAP: ProxyPrivacyInput = { ip: true, userAgent: false, language: true, screen: false, timezone: false, hardware: true }
export const PRIVACY_IP_ONLY: ProxyPrivacyInput = { ip: true, userAgent: false, language: false, screen: false, timezone: false, hardware: false }

// SDK-specific regex patterns used in postProcess functions
const FATHOM_SELF_HOSTED_RE = /\.src\.indexOf\("cdn\.usefathom\.com"\)\s*<\s*0/
const RYBBIT_HOST_SPLIT_RE = /\w+\.split\(["']\/script\.js["']\)\[0\]/g

// Capability presets. partytown: true only for scripts with known PARTYTOWN_FORWARDS in module.ts.
const CAP_FULL_PT: ScriptCapabilities = { bundle: true, proxy: true, partytown: true }
const CAP_FULL: ScriptCapabilities = { bundle: true, proxy: true }
const CAP_BUNDLE_PT: ScriptCapabilities = { bundle: true, partytown: true }
const CAP_BUNDLE: ScriptCapabilities = { bundle: true }
const CAP_PROXY: ScriptCapabilities = { proxy: true }

// -- defineRegistryScript helper --

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
}

/** Derive defaultCapability from capabilities: same flags minus partytown. */
function deriveDefaultCapability(capabilities?: ScriptCapabilities): ScriptCapabilities | undefined {
  if (!capabilities)
    return undefined
  const { partytown: _, ...rest } = capabilities
  return rest
}

type RegistryScriptDef = Omit<RegistryScript, 'registryKey' | 'import' | 'logo' | 'defaultCapability'> & {
  /** Override auto-derived composable name, or false to skip composable registration */
  composableName?: string | false
  /** Override auto-derived defaultCapability (defaults to capabilities minus partytown) */
  defaultCapability?: ScriptCapabilities
  /** Server handlers with unresolved paths (resolved automatically by the helper) */
  serverHandlers?: RegistryScriptServerHandler[]
}

async function defineScript(
  resolve: (path: string, opts?: ResolvePathOptions) => Promise<string>,
  registryKey: string,
  script: RegistryScriptDef,
): Promise<RegistryScript> {
  const { composableName, defaultCapability, serverHandlers, ...rest } = script
  const result: RegistryScript = {
    registryKey: registryKey as RegistryScriptKey,
    logo: LOGOS[registryKey as keyof typeof LOGOS],
    defaultCapability: defaultCapability || deriveDefaultCapability(rest.capabilities),
    ...rest,
  }

  if (composableName !== false) {
    result.import = {
      name: composableName || `useScript${registryKey.charAt(0).toUpperCase()}${registryKey.slice(1)}`,
      from: await resolve(`./runtime/registry/${camelToKebab(registryKey)}`),
    }
  }

  if (serverHandlers) {
    result.serverHandlers = await Promise.all(
      serverHandlers.map(async h => ({ ...h, handler: await resolve(h.handler) })),
    )
  }

  return result
}

// -- Registry --

export async function registry(resolve?: (path: string, opts?: ResolvePathOptions | undefined) => Promise<string>): Promise<RegistryScript[]> {
  resolve = resolve || ((s: string) => Promise.resolve(s))
  const def = (key: string, script: RegistryScriptDef) => defineScript(resolve, key, script)

  return Promise.all([
    // analytics
    def('plausibleAnalytics', {
      label: 'Plausible Analytics',
      category: 'analytics',
      capabilities: CAP_FULL_PT,
      domains: ['plausible.io'],
      privacy: PRIVACY_IP_ONLY,
      autoInject: { configField: 'endpoint', computeValue: proxyPrefix => `${proxyPrefix}/plausible.io/api/event` },
      scriptBundling: (options?: PlausibleAnalyticsInput) => {
        if (options?.scriptId)
          return `https://plausible.io/js/pa-${options.scriptId}.js`
        const extensions = Array.isArray(options?.extension) ? options.extension.join('.') : [options?.extension]
        return options?.extension ? `https://plausible.io/js/script.${extensions}.js` : 'https://plausible.io/js/script.js'
      },
    }),
    def('cloudflareWebAnalytics', {
      schema: CloudflareWebAnalyticsOptions,
      label: 'Cloudflare Web Analytics',
      src: 'https://static.cloudflareinsights.com/beacon.min.js',
      category: 'analytics',
      capabilities: CAP_FULL_PT,
      domains: ['static.cloudflareinsights.com', 'cloudflareinsights.com'],
      privacy: PRIVACY_IP_ONLY,
    }),
    def('vercelAnalytics', {
      schema: VercelAnalyticsOptions,
      label: 'Vercel Analytics',
      src: 'https://va.vercel-scripts.com/v1/script.js',
      category: 'analytics',
      capabilities: CAP_FULL,
      domains: ['va.vercel-scripts.com'],
      privacy: PRIVACY_IP_ONLY,
    }),
    def('posthog', {
      composableName: 'useScriptPostHog',
      schema: PostHogOptions,
      label: 'PostHog',
      src: false,
      scriptBundling: false,
      capabilities: CAP_PROXY,
      domains: ['us-assets.i.posthog.com', 'us.i.posthog.com', 'eu-assets.i.posthog.com', 'eu.i.posthog.com'],
      privacy: PRIVACY_IP_ONLY,
      autoInject: {
        configField: 'apiHost',
        computeValue: (proxyPrefix, config) => {
          const region = config.region || 'us'
          const host = region === 'eu' ? 'eu.i.posthog.com' : 'us.i.posthog.com'
          return `${proxyPrefix}/${host}`
        },
      },
      category: 'analytics',
    }),
    def('fathomAnalytics', {
      schema: FathomAnalyticsOptions,
      label: 'Fathom Analytics',
      src: 'https://cdn.usefathom.com/script.js',
      category: 'analytics',
      capabilities: CAP_FULL_PT,
      domains: ['cdn.usefathom.com'],
      privacy: PRIVACY_IP_ONLY,
      postProcess(output) { return output.replace(FATHOM_SELF_HOSTED_RE, '.src.indexOf("cdn.usefathom.com")<-1') },
    }),
    def('matomoAnalytics', {
      schema: MatomoAnalyticsOptions,
      label: 'Matomo Analytics',
      scriptBundling: false,
      capabilities: CAP_FULL_PT,
      domains: ['cdn.matomo.cloud'],
      privacy: PRIVACY_IP_ONLY,
      category: 'analytics',
    }),
    def('rybbitAnalytics', {
      schema: RybbitAnalyticsOptions,
      label: 'Rybbit Analytics',
      capabilities: CAP_FULL,
      domains: ['app.rybbit.io'],
      privacy: PRIVACY_IP_ONLY,
      autoInject: { configField: 'analyticsHost', computeValue: proxyPrefix => `${proxyPrefix}/app.rybbit.io/api` },
      postProcess(output, rewrites) {
        const rybbitRewrite = rewrites.find(r => r.from === 'app.rybbit.io')
        if (rybbitRewrite)
          output = output.replace(RYBBIT_HOST_SPLIT_RE, `self.location.origin+"${rybbitRewrite.to}/api"`)
        return output
      },
      scriptBundling: (options?: RybbitAnalyticsInput) => {
        const host = options?.analyticsHost
        if (host && !host.startsWith('/'))
          return `${host}/script.js`
        return 'https://app.rybbit.io/api/script.js'
      },
      category: 'analytics',
    }),
    def('databuddyAnalytics', {
      schema: DatabuddyAnalyticsOptions,
      label: 'Databuddy Analytics',
      capabilities: CAP_FULL,
      domains: ['cdn.databuddy.cc', 'basket.databuddy.cc'],
      privacy: PRIVACY_IP_ONLY,
      autoInject: { configField: 'apiUrl', computeValue: proxyPrefix => `${proxyPrefix}/basket.databuddy.cc` },
      scriptBundling: () => 'https://cdn.databuddy.cc/databuddy.js',
      category: 'analytics',
    }),
    def('segment', {
      schema: SegmentOptions,
      label: 'Segment',
      capabilities: CAP_BUNDLE_PT,
      scriptBundling: (options?: SegmentInput) => {
        return joinURL('https://cdn.segment.com/analytics.js/v1', options?.writeKey || '', 'analytics.min.js')
      },
      category: 'analytics',
    }),
    def('mixpanelAnalytics', {
      schema: MixpanelAnalyticsOptions,
      label: 'Mixpanel',
      capabilities: CAP_BUNDLE_PT,
      scriptBundling: (options?: MixpanelAnalyticsInput) => {
        if (!options?.token)
          return false
        return 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'
      },
      category: 'analytics',
    }),
    // ad
    def('bingUet', {
      schema: BingUetOptions,
      label: 'Bing UET',
      src: 'https://bat.bing.com/bat.js',
      capabilities: CAP_BUNDLE_PT,
      category: 'ad',
    }),
    def('metaPixel', {
      schema: MetaPixelOptions,
      label: 'Meta Pixel',
      src: 'https://connect.facebook.net/en_US/fbevents.js',
      category: 'ad',
      capabilities: CAP_FULL_PT,
      domains: ['connect.facebook.net', 'www.facebook.com', 'facebook.com', 'pixel.facebook.com'],
      privacy: PRIVACY_FULL,
    }),
    def('xPixel', {
      schema: XPixelOptions,
      label: 'X Pixel',
      src: 'https://static.ads-twitter.com/uwt.js',
      category: 'ad',
      capabilities: CAP_FULL_PT,
      domains: ['analytics.twitter.com', 'static.ads-twitter.com', 't.co'],
      privacy: PRIVACY_FULL,
    }),
    def('tiktokPixel', {
      composableName: 'useScriptTikTokPixel',
      schema: TikTokPixelOptions,
      label: 'TikTok Pixel',
      category: 'ad',
      capabilities: CAP_FULL_PT,
      domains: ['analytics.tiktok.com'],
      privacy: PRIVACY_FULL,
      scriptBundling(options?: TikTokPixelInput) {
        if (!options?.id)
          return false
        return withQuery('https://analytics.tiktok.com/i18n/pixel/events.js', { sdkid: options.id, lib: 'ttq' })
      },
    }),
    def('snapchatPixel', {
      schema: SnapTrPixelOptions,
      label: 'Snapchat Pixel',
      src: 'https://sc-static.net/scevent.min.js',
      category: 'ad',
      capabilities: CAP_FULL_PT,
      domains: ['sc-static.net', 'tr.snapchat.com', 'pixel.tapad.com'],
      privacy: PRIVACY_FULL,
    }),
    def('redditPixel', {
      schema: RedditPixelOptions,
      label: 'Reddit Pixel',
      src: 'https://www.redditstatic.com/ads/pixel.js',
      category: 'ad',
      capabilities: CAP_FULL_PT,
      domains: ['www.redditstatic.com', 'alb.reddit.com', 'pixel-config.reddit.com'],
      privacy: PRIVACY_FULL,
    }),
    def('googleAdsense', {
      schema: GoogleAdsenseOptions,
      label: 'Google Adsense',
      capabilities: CAP_FULL,
      proxyConfig: 'googleAnalytics',
      scriptBundling: (options?: GoogleAdsenseInput) => {
        if (!options?.client)
          return false
        return withQuery('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { client: options?.client })
      },
      category: 'ad',
    }),
    def('carbonAds', {
      composableName: false,
      label: 'Carbon Ads',
      scriptBundling: false,
      capabilities: CAP_FULL,
      domains: ['cdn.carbonads.com'],
      privacy: PRIVACY_IP_ONLY,
      category: 'ad',
    }),
    // support
    def('intercom', {
      schema: IntercomOptions,
      label: 'Intercom',
      capabilities: CAP_FULL,
      domains: ['widget.intercom.io', 'api-iam.intercom.io', 'api-iam.eu.intercom.io', 'api-iam.au.intercom.io', 'js.intercomcdn.com', 'downloads.intercomcdn.com', 'video-messages.intercomcdn.com'],
      privacy: PRIVACY_IP_ONLY,
      scriptBundling(options?: IntercomInput) {
        if (!options?.app_id)
          return false
        return joinURL(`https://widget.intercom.io/widget`, options?.app_id || '')
      },
      category: 'support',
    }),
    def('hotjar', {
      schema: HotjarOptions,
      label: 'Hotjar',
      capabilities: CAP_FULL,
      domains: ['static.hotjar.com', 'script.hotjar.com', 'vars.hotjar.com', 'in.hotjar.com', 'vc.hotjar.com', 'vc.hotjar.io', 'metrics.hotjar.io', 'insights.hotjar.com', 'ask.hotjar.io', 'events.hotjar.io', 'identify.hotjar.com', 'surveystats.hotjar.io'],
      privacy: PRIVACY_HEATMAP,
      scriptBundling(options?: HotjarInput) {
        if (!options?.id)
          return false
        return withQuery(`https://static.hotjar.com/c/hotjar-${options?.id || ''}.js`, { sv: options?.sv || '6' })
      },
      category: 'analytics',
    }),
    def('clarity', {
      schema: ClarityOptions,
      label: 'Clarity',
      capabilities: CAP_FULL_PT,
      domains: ['www.clarity.ms', 'scripts.clarity.ms', 'd.clarity.ms', 'e.clarity.ms', 'k.clarity.ms'],
      privacy: PRIVACY_HEATMAP,
      scriptBundling(options?: ClarityInput) {
        if (!options?.id)
          return false
        return `https://www.clarity.ms/tag/${options?.id}`
      },
      category: 'analytics',
    }),
    // payments
    def('stripe', {
      schema: StripeOptions,
      label: 'Stripe',
      scriptBundling: false,
      category: 'payments',
    }),
    def('lemonSqueezy', {
      label: 'Lemon Squeezy',
      src: false,
      capabilities: CAP_FULL,
      domains: ['assets.lemonsqueezy.com'],
      privacy: PRIVACY_IP_ONLY,
      category: 'payments',
    }),
    def('paypal', {
      composableName: 'useScriptPayPal',
      label: 'PayPal',
      src: false,
      category: 'payments',
    }),
    // video
    def('vimeoPlayer', {
      label: 'Vimeo Player',
      capabilities: CAP_FULL,
      domains: ['player.vimeo.com'],
      privacy: PRIVACY_IP_ONLY,
      category: 'video',
    }),
    def('youtubePlayer', {
      composableName: 'useScriptYouTubePlayer',
      label: 'YouTube Player',
      capabilities: CAP_FULL,
      domains: ['www.youtube.com'],
      privacy: PRIVACY_IP_ONLY,
      category: 'video',
    }),
    // content
    def('googleMaps', {
      schema: GoogleMapsOptions,
      label: 'Google Maps',
      category: 'content',
      serverHandlers: [
        { route: '/_scripts/proxy/google-static-maps', handler: './runtime/server/google-static-maps-proxy' },
        { route: '/_scripts/proxy/google-maps-geocode', handler: './runtime/server/google-maps-geocode-proxy' },
      ],
    }),
    def('blueskyEmbed', {
      composableName: false,
      schema: BlueskyEmbedOptions,
      label: 'Bluesky Embed',
      category: 'content',
      serverHandlers: [
        { route: '/_scripts/embed/bluesky', handler: './runtime/server/bluesky-embed' },
        { route: '/_scripts/embed/bluesky-image', handler: './runtime/server/bluesky-embed-image' },
      ],
    }),
    def('instagramEmbed', {
      composableName: false,
      schema: InstagramEmbedOptions,
      label: 'Instagram Embed',
      category: 'content',
      serverHandlers: [
        { route: '/_scripts/embed/instagram', handler: './runtime/server/instagram-embed' },
        { route: '/_scripts/embed/instagram-image', handler: './runtime/server/instagram-embed-image' },
        { route: '/_scripts/embed/instagram-asset', handler: './runtime/server/instagram-embed-asset' },
      ],
    }),
    def('xEmbed', {
      composableName: false,
      schema: XEmbedOptions,
      label: 'X Embed',
      category: 'content',
      serverHandlers: [
        { route: '/_scripts/embed/x', handler: './runtime/server/x-embed' },
        { route: '/_scripts/embed/x-image', handler: './runtime/server/x-embed-image' },
      ],
    }),
    // support
    def('crisp', {
      schema: CrispOptions,
      label: 'Crisp',
      capabilities: CAP_BUNDLE,
      category: 'support',
    }),
    // cdn
    def('npm', {
      schema: NpmOptions,
      label: 'NPM',
      scriptBundling(options?: NpmInput) {
        return withBase(options?.file || '', `https://unpkg.com/${options?.packageName || ''}@${options?.version || 'latest'}`)
      },
      category: 'cdn',
    }),
    // utility
    def('googleRecaptcha', {
      schema: GoogleRecaptchaOptions,
      label: 'Google reCAPTCHA',
      scriptBundling: false,
      category: 'utility',
    }),
    def('googleSignIn', {
      schema: GoogleSignInOptions,
      label: 'Google Sign-In',
      src: 'https://accounts.google.com/gsi/client',
      scriptBundling: false,
      category: 'utility',
    }),
    def('googleTagManager', {
      schema: GoogleTagManagerOptions,
      label: 'Google Tag Manager',
      capabilities: CAP_BUNDLE,
      category: 'tag-manager',
      scriptBundling(options) {
        if (!options?.id)
          return false
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
    }),
    def('googleAnalytics', {
      schema: GoogleAnalyticsOptions,
      label: 'Google Analytics',
      capabilities: CAP_FULL_PT,
      domains: ['www.google-analytics.com', 'analytics.google.com', 'stats.g.doubleclick.net', 'pagead2.googlesyndication.com', 'www.googleadservices.com', 'googleads.g.doubleclick.net'],
      privacy: PRIVACY_HEATMAP,
      category: 'analytics',
      scriptBundling(options) {
        if (!options?.id)
          return false
        return withQuery('https://www.googletagmanager.com/gtag/js', { id: options?.id, l: options?.l })
      },
    }),
    def('umamiAnalytics', {
      schema: UmamiAnalyticsOptions,
      label: 'Umami Analytics',
      capabilities: CAP_FULL_PT,
      domains: ['cloud.umami.is', 'api-gateway.umami.dev'],
      privacy: PRIVACY_IP_ONLY,
      autoInject: { configField: 'hostUrl', computeValue: proxyPrefix => `${proxyPrefix}/cloud.umami.is` },
      scriptBundling: () => 'https://cloud.umami.is/script.js',
      category: 'analytics',
    }),
    def('gravatar', {
      schema: GravatarOptions,
      label: 'Gravatar',
      src: 'https://secure.gravatar.com/js/gprofiles.js',
      capabilities: CAP_FULL,
      domains: ['secure.gravatar.com', 'gravatar.com'],
      privacy: PRIVACY_IP_ONLY,
      category: 'utility',
      serverHandlers: [
        { route: '/_scripts/proxy/gravatar', handler: './runtime/server/gravatar-proxy' },
      ],
    }),
  ])
}
