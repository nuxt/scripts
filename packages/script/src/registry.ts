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
import type { ProxyAutoInject, ProxyCapability, ProxyConfig, RegistryScript, RegistryScriptKey, RegistryScriptServerHandler, ResolvedProxyAutoInject, ScriptCapabilities } from './runtime/types'
import { joinURL, withBase, withQuery } from 'ufo'
import { logger } from './logger'
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

// Privacy presets
export const PRIVACY_NONE: ProxyPrivacyInput = { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false }
export const PRIVACY_FULL: ProxyPrivacyInput = { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true }
export const PRIVACY_HEATMAP: ProxyPrivacyInput = { ip: true, userAgent: false, language: true, screen: false, timezone: false, hardware: true }
export const PRIVACY_IP_ONLY: ProxyPrivacyInput = { ip: true, userAgent: false, language: false, screen: false, timezone: false, hardware: false }

// -- Helpers --

/** Get the resolved proxy definition, following aliases. */
export function getProxyDef(script: RegistryScript, scriptByKey?: Map<string, RegistryScript>): ProxyCapability | undefined {
  if (!script.proxy)
    return undefined
  if (typeof script.proxy === 'string')
    return scriptByKey?.get(script.proxy)?.proxy as ProxyCapability | undefined
  return script.proxy
}

/** Resolve ProxyAutoInject shorthand into the full { configField, computeValue } form. */
export function resolveAutoInject(ai: ProxyAutoInject): ResolvedProxyAutoInject {
  const computeValue = ai.resolve
    ? ai.resolve
    : ai.target
      ? (proxyPrefix: string) => `${proxyPrefix}/${ai.target}`
      : undefined
  if (!computeValue)
    throw new Error(`ProxyAutoInject for field "${ai.field}" needs either "target" or "resolve"`)
  return { configField: ai.field, computeValue }
}

/** Get the bundle resolve function, if any. */
export function getBundleResolve(script: RegistryScript): ((options?: any) => string | false) | undefined {
  if (!script.bundle || script.bundle === true)
    return undefined
  return script.bundle.resolve
}

/** Get partytown forwards, if any. */
export function getPartytownForwards(script: RegistryScript): string[] | undefined {
  return script.partytown?.forwards
}

/** Derive ScriptCapabilities from the new nested structure. */
export function getCapabilities(script: RegistryScript): ScriptCapabilities {
  return {
    bundle: !!script.bundle,
    proxy: !!script.proxy,
    partytown: !!script.partytown,
  }
}

// -- defineRegistryScript helper --

const UPPER_CASE_RE = /[A-Z]/g

function camelToKebab(str: string): string {
  return str.replace(UPPER_CASE_RE, m => `-${m.toLowerCase()}`)
}

type RegistryScriptDef = Omit<RegistryScript, 'registryKey' | 'import' | 'logo'> & {
  /** Override auto-derived composable name, or false to skip composable registration */
  composableName?: string | false
  /** Server handlers with unresolved paths (resolved automatically by the helper) */
  serverHandlers?: RegistryScriptServerHandler[]
}

async function defineScript(
  resolve: (path: string, opts?: ResolvePathOptions) => Promise<string>,
  registryKey: string,
  script: RegistryScriptDef,
): Promise<RegistryScript> {
  const { composableName, serverHandlers, ...rest } = script
  const result: RegistryScript = {
    registryKey: registryKey as RegistryScriptKey,
    logo: LOGOS[registryKey as keyof typeof LOGOS],
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
      envDefaults: { domain: '' },
      bundle: {
        resolve: (options?: PlausibleAnalyticsInput) => {
          if (options?.scriptId)
            return `https://plausible.io/js/pa-${options.scriptId}.js`
          const extensions = Array.isArray(options?.extension) ? options.extension.join('.') : [options?.extension]
          return options?.extension ? `https://plausible.io/js/script.${extensions}.js` : 'https://plausible.io/js/script.js'
        },
      },
      proxy: {
        domains: ['plausible.io'],
        privacy: PRIVACY_IP_ONLY,
        autoInject: { field: 'endpoint', target: 'plausible.io/api/event' },
      },
      partytown: { forwards: ['plausible'] },
    }),
    def('cloudflareWebAnalytics', {
      schema: CloudflareWebAnalyticsOptions,
      label: 'Cloudflare Web Analytics',
      src: 'https://static.cloudflareinsights.com/beacon.min.js',
      category: 'analytics',
      envDefaults: { token: '' },
      bundle: true,
      proxy: {
        domains: ['static.cloudflareinsights.com', 'cloudflareinsights.com'],
        privacy: PRIVACY_IP_ONLY,
      },
      partytown: { forwards: ['__cfBeacon'] },
    }),
    def('vercelAnalytics', {
      schema: VercelAnalyticsOptions,
      label: 'Vercel Analytics',
      src: 'https://va.vercel-scripts.com/v1/script.js',
      category: 'analytics',
      bundle: true,
      proxy: {
        domains: ['va.vercel-scripts.com'],
        privacy: PRIVACY_IP_ONLY,
      },
    }),
    def('posthog', {
      composableName: 'useScriptPostHog',
      schema: PostHogOptions,
      label: 'PostHog',
      src: false,
      category: 'analytics',
      envDefaults: { apiKey: '' },
      proxy: {
        domains: ['us-assets.i.posthog.com', 'us.i.posthog.com', 'eu-assets.i.posthog.com', 'eu.i.posthog.com'],
        privacy: PRIVACY_IP_ONLY,
        autoInject: {
          field: 'apiHost',
          resolve: (proxyPrefix, config) => {
            const region = config.region || 'us'
            const host = region === 'eu' ? 'eu.i.posthog.com' : 'us.i.posthog.com'
            return `${proxyPrefix}/${host}`
          },
        },
      },
    }),
    def('fathomAnalytics', {
      schema: FathomAnalyticsOptions,
      label: 'Fathom Analytics',
      src: 'https://cdn.usefathom.com/script.js',
      category: 'analytics',
      envDefaults: { site: '' },
      bundle: true,
      proxy: {
        domains: ['cdn.usefathom.com'],
        privacy: PRIVACY_IP_ONLY,
        sdkPatches: [{ type: 'neutralize-domain-check' }],
      },
      partytown: { forwards: ['fathom', 'fathom.trackEvent', 'fathom.trackPageview'] },
    }),
    def('matomoAnalytics', {
      schema: MatomoAnalyticsOptions,
      label: 'Matomo Analytics',
      category: 'analytics',
      envDefaults: { matomoUrl: '' },
      proxy: {
        domains: ['cdn.matomo.cloud'],
        privacy: PRIVACY_IP_ONLY,
      },
      partytown: { forwards: ['_paq.push'] },
    }),
    def('rybbitAnalytics', {
      schema: RybbitAnalyticsOptions,
      label: 'Rybbit Analytics',
      category: 'analytics',
      envDefaults: { siteId: '' },
      bundle: {
        resolve: (options?: RybbitAnalyticsInput) => {
          const host = options?.analyticsHost
          if (host && !host.startsWith('/'))
            return `${host}/script.js`
          return 'https://app.rybbit.io/api/script.js'
        },
      },
      proxy: {
        domains: ['app.rybbit.io'],
        privacy: PRIVACY_IP_ONLY,
        autoInject: { field: 'analyticsHost', target: 'app.rybbit.io/api' },
        sdkPatches: [{ type: 'replace-src-split', separator: '/script.js', fromDomain: 'app.rybbit.io', appendPath: 'api' }],
      },
    }),
    def('databuddyAnalytics', {
      schema: DatabuddyAnalyticsOptions,
      label: 'Databuddy Analytics',
      category: 'analytics',
      envDefaults: { clientId: '' },
      bundle: {
        resolve: () => 'https://cdn.databuddy.cc/databuddy.js',
      },
      proxy: {
        domains: ['cdn.databuddy.cc', 'basket.databuddy.cc'],
        privacy: PRIVACY_IP_ONLY,
        autoInject: { field: 'apiUrl', target: 'basket.databuddy.cc' },
      },
    }),
    def('segment', {
      schema: SegmentOptions,
      label: 'Segment',
      category: 'analytics',
      envDefaults: { writeKey: '' },
      bundle: {
        resolve: (options?: SegmentInput) => {
          return joinURL('https://cdn.segment.com/analytics.js/v1', options?.writeKey || '', 'analytics.min.js')
        },
      },
      partytown: { forwards: ['analytics', 'analytics.track', 'analytics.page', 'analytics.identify'] },
    }),
    def('mixpanelAnalytics', {
      schema: MixpanelAnalyticsOptions,
      label: 'Mixpanel',
      category: 'analytics',
      envDefaults: { token: '' },
      bundle: {
        resolve: (options?: MixpanelAnalyticsInput) => {
          if (!options?.token)
            return false
          return 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js'
        },
      },
      partytown: { forwards: ['mixpanel', 'mixpanel.init', 'mixpanel.track', 'mixpanel.identify', 'mixpanel.people.set', 'mixpanel.reset', 'mixpanel.register'] },
    }),
    // ad
    def('bingUet', {
      schema: BingUetOptions,
      label: 'Bing UET',
      src: 'https://bat.bing.com/bat.js',
      category: 'ad',
      envDefaults: { id: '' },
      bundle: true,
      partytown: { forwards: ['uetq.push'] },
    }),
    def('metaPixel', {
      schema: MetaPixelOptions,
      label: 'Meta Pixel',
      src: 'https://connect.facebook.net/en_US/fbevents.js',
      category: 'ad',
      envDefaults: { id: '' },
      bundle: true,
      proxy: {
        domains: ['connect.facebook.net', 'www.facebook.com', 'facebook.com', 'pixel.facebook.com'],
        privacy: PRIVACY_FULL,
      },
      partytown: { forwards: ['fbq'] },
    }),
    def('xPixel', {
      schema: XPixelOptions,
      label: 'X Pixel',
      src: 'https://static.ads-twitter.com/uwt.js',
      category: 'ad',
      envDefaults: { id: '' },
      bundle: true,
      proxy: {
        domains: ['analytics.twitter.com', 'static.ads-twitter.com', 't.co'],
        privacy: PRIVACY_FULL,
      },
      partytown: { forwards: ['twq'] },
    }),
    def('tiktokPixel', {
      composableName: 'useScriptTikTokPixel',
      schema: TikTokPixelOptions,
      label: 'TikTok Pixel',
      category: 'ad',
      envDefaults: { id: '' },
      bundle: {
        resolve(options?: TikTokPixelInput) {
          if (!options?.id)
            return false
          return withQuery('https://analytics.tiktok.com/i18n/pixel/events.js', { sdkid: options.id, lib: 'ttq' })
        },
      },
      proxy: {
        domains: ['analytics.tiktok.com'],
        privacy: PRIVACY_FULL,
      },
      partytown: { forwards: ['ttq.track', 'ttq.page', 'ttq.identify'] },
    }),
    def('snapchatPixel', {
      schema: SnapTrPixelOptions,
      label: 'Snapchat Pixel',
      src: 'https://sc-static.net/scevent.min.js',
      category: 'ad',
      envDefaults: { id: '' },
      bundle: true,
      proxy: {
        domains: ['sc-static.net', 'tr.snapchat.com', 'pixel.tapad.com'],
        privacy: PRIVACY_FULL,
      },
      partytown: { forwards: ['snaptr'] },
    }),
    def('redditPixel', {
      schema: RedditPixelOptions,
      label: 'Reddit Pixel',
      src: 'https://www.redditstatic.com/ads/pixel.js',
      category: 'ad',
      envDefaults: { id: '' },
      bundle: true,
      proxy: {
        domains: ['www.redditstatic.com', 'alb.reddit.com', 'pixel-config.reddit.com'],
        privacy: PRIVACY_FULL,
      },
      partytown: { forwards: ['rdt'] },
    }),
    def('googleAdsense', {
      schema: GoogleAdsenseOptions,
      label: 'Google Adsense',
      category: 'ad',
      envDefaults: { client: '' },
      bundle: {
        resolve: (options?: GoogleAdsenseInput) => {
          if (!options?.client)
            return false
          return withQuery('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { client: options?.client })
        },
      },
      proxy: 'googleAnalytics',
    }),
    def('carbonAds', {
      composableName: false,
      label: 'Carbon Ads',
      category: 'ad',
      proxy: {
        domains: ['cdn.carbonads.com'],
        privacy: PRIVACY_IP_ONLY,
      },
    }),
    // support
    def('intercom', {
      schema: IntercomOptions,
      label: 'Intercom',
      category: 'support',
      envDefaults: { app_id: '' },
      bundle: {
        resolve(options?: IntercomInput) {
          if (!options?.app_id)
            return false
          return joinURL(`https://widget.intercom.io/widget`, options?.app_id || '')
        },
      },
      proxy: {
        domains: ['widget.intercom.io', 'api-iam.intercom.io', 'api-iam.eu.intercom.io', 'api-iam.au.intercom.io', 'js.intercomcdn.com', 'downloads.intercomcdn.com', 'video-messages.intercomcdn.com'],
        privacy: PRIVACY_IP_ONLY,
      },
    }),
    def('hotjar', {
      schema: HotjarOptions,
      label: 'Hotjar',
      category: 'analytics',
      envDefaults: { id: '' },
      bundle: {
        resolve(options?: HotjarInput) {
          if (!options?.id)
            return false
          return withQuery(`https://static.hotjar.com/c/hotjar-${options?.id || ''}.js`, { sv: options?.sv || '6' })
        },
      },
      proxy: {
        domains: ['static.hotjar.com', 'script.hotjar.com', 'vars.hotjar.com', 'in.hotjar.com', 'vc.hotjar.com', 'vc.hotjar.io', 'metrics.hotjar.io', 'insights.hotjar.com', 'ask.hotjar.io', 'events.hotjar.io', 'identify.hotjar.com', 'surveystats.hotjar.io'],
        privacy: PRIVACY_HEATMAP,
      },
    }),
    def('clarity', {
      schema: ClarityOptions,
      label: 'Clarity',
      category: 'analytics',
      envDefaults: { id: '' },
      bundle: {
        resolve(options?: ClarityInput) {
          if (!options?.id)
            return false
          return `https://www.clarity.ms/tag/${options?.id}`
        },
      },
      proxy: {
        domains: ['www.clarity.ms', 'scripts.clarity.ms', 'd.clarity.ms', 'e.clarity.ms', 'k.clarity.ms'],
        privacy: PRIVACY_HEATMAP,
      },
      partytown: { forwards: [] },
    }),
    // payments
    def('stripe', {
      schema: StripeOptions,
      label: 'Stripe',
      category: 'payments',
    }),
    def('lemonSqueezy', {
      label: 'Lemon Squeezy',
      src: false,
      category: 'payments',
      proxy: {
        domains: ['assets.lemonsqueezy.com'],
        privacy: PRIVACY_IP_ONLY,
      },
    }),
    def('paypal', {
      composableName: 'useScriptPayPal',
      label: 'PayPal',
      src: false,
      envDefaults: { clientId: '' },
      category: 'payments',
    }),
    // video
    def('vimeoPlayer', {
      label: 'Vimeo Player',
      category: 'video',
      bundle: true,
      proxy: {
        domains: ['player.vimeo.com'],
        privacy: PRIVACY_IP_ONLY,
      },
    }),
    def('youtubePlayer', {
      composableName: 'useScriptYouTubePlayer',
      label: 'YouTube Player',
      category: 'video',
      bundle: true,
      proxy: {
        domains: ['www.youtube.com'],
        privacy: PRIVACY_IP_ONLY,
      },
    }),
    // content
    def('googleMaps', {
      schema: GoogleMapsOptions,
      label: 'Google Maps',
      envDefaults: { apiKey: '' },
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
      category: 'support',
      envDefaults: { id: '' },
      bundle: true,
    }),
    // cdn
    def('npm', {
      schema: NpmOptions,
      label: 'NPM',
      category: 'cdn',
      bundle: {
        resolve(options?: NpmInput) {
          return withBase(options?.file || '', `https://unpkg.com/${options?.packageName || ''}@${options?.version || 'latest'}`)
        },
      },
    }),
    // utility
    def('googleRecaptcha', {
      schema: GoogleRecaptchaOptions,
      label: 'Google reCAPTCHA',
      envDefaults: { siteKey: '' },
      category: 'utility',
    }),
    def('googleSignIn', {
      schema: GoogleSignInOptions,
      label: 'Google Sign-In',
      src: 'https://accounts.google.com/gsi/client',
      envDefaults: { clientId: '' },
      category: 'utility',
    }),
    def('googleTagManager', {
      schema: GoogleTagManagerOptions,
      label: 'Google Tag Manager',
      category: 'tag-manager',
      envDefaults: { id: '' },
      bundle: {
        resolve(options) {
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
      },
    }),
    def('googleAnalytics', {
      schema: GoogleAnalyticsOptions,
      label: 'Google Analytics',
      category: 'analytics',
      envDefaults: { id: '' },
      bundle: {
        resolve(options) {
          if (!options?.id)
            return false
          return withQuery('https://www.googletagmanager.com/gtag/js', { id: options?.id, l: options?.l })
        },
      },
      proxy: {
        domains: ['www.google-analytics.com', 'analytics.google.com', 'stats.g.doubleclick.net', 'pagead2.googlesyndication.com', 'www.googleadservices.com', 'googleads.g.doubleclick.net'],
        privacy: PRIVACY_HEATMAP,
      },
      partytown: { forwards: ['dataLayer.push', 'gtag'] },
    }),
    def('umamiAnalytics', {
      schema: UmamiAnalyticsOptions,
      label: 'Umami Analytics',
      category: 'analytics',
      envDefaults: { websiteId: '' },
      bundle: {
        resolve: () => 'https://cloud.umami.is/script.js',
      },
      proxy: {
        domains: ['cloud.umami.is', 'api-gateway.umami.dev'],
        privacy: PRIVACY_IP_ONLY,
        autoInject: { field: 'hostUrl', target: 'cloud.umami.is' },
      },
      partytown: { forwards: ['umami', 'umami.track'] },
    }),
    def('gravatar', {
      schema: GravatarOptions,
      label: 'Gravatar',
      src: 'https://secure.gravatar.com/js/gprofiles.js',
      category: 'utility',
      bundle: true,
      proxy: {
        domains: ['secure.gravatar.com', 'gravatar.com'],
        privacy: PRIVACY_IP_ONLY,
      },
      serverHandlers: [
        { route: '/_scripts/proxy/gravatar', handler: './runtime/server/gravatar-proxy' },
      ],
    }),
  ])
}

// -- Partytown resolve URL generation --

/**
 * Generate a Partytown `resolveUrl` function string for proxy routing.
 * Partytown calls this for every network request made by worker-executed scripts.
 * Any non-same-origin URL is proxied through `proxyPrefix/<host><path>`.
 */
export function generatePartytownResolveUrl(proxyPrefix: string): string {
  return `function(url, location, type) {
  if (url.origin !== location.origin) {
    return new URL(${JSON.stringify(proxyPrefix)} + '/' + url.host + url.pathname + url.search, location.origin);
  }
}`
}

// -- Capability resolution --

/**
 * Resolve the effective capabilities for a script by merging:
 * 1. Derive ceiling from script's bundle/proxy/partytown keys
 * 2. Default = ceiling minus partytown (user must opt-in)
 * 3. Apply user overrides from scriptOptions
 * 4. Clamp to ceiling (user can't enable unsupported capabilities)
 * 5. Warn in dev if user tries to exceed ceiling
 */
export function resolveCapabilities(
  script: RegistryScript,
  scriptOptions?: Record<string, any>,
): ScriptCapabilities {
  const ceiling = getCapabilities(script)
  // Default: all capabilities enabled except partytown (requires opt-in)
  const defaults: ScriptCapabilities = { ...ceiling, partytown: false }

  const resolved: ScriptCapabilities = { ...defaults }

  if (!scriptOptions)
    return resolved

  const overrideKeys: (keyof ScriptCapabilities)[] = ['proxy', 'bundle', 'partytown']

  for (const key of overrideKeys) {
    if (key in scriptOptions) {
      const userValue = scriptOptions[key]
      if (typeof userValue !== 'boolean')
        continue

      if (userValue && !ceiling[key]) {
        if (import.meta.dev) {
          logger.warn(
            `[nuxt-scripts] Script "${script.registryKey}" does not support capability "${key}". `
            + `This override will be ignored. Supported capabilities: ${JSON.stringify(ceiling)}`,
          )
        }
        continue
      }

      resolved[key] = userValue
    }
  }

  return resolved
}

// -- Proxy config building --

/**
 * Build proxy configs from registry scripts.
 * Each script with proxy capability gets a proxy config.
 * Scripts with a string proxy alias inherit from the referenced script.
 */
export function buildProxyConfigsFromRegistry(
  scripts: RegistryScript[],
  scriptByKey?: Map<string, RegistryScript>,
): Partial<Record<RegistryScriptKey, ProxyConfig>> {
  const configs: Partial<Record<RegistryScriptKey, ProxyConfig>> = {}

  if (!scriptByKey) {
    scriptByKey = new Map()
    for (const script of scripts) {
      if (script.registryKey)
        scriptByKey.set(script.registryKey, script)
    }
  }

  for (const script of scripts) {
    if (!script.registryKey || !script.proxy)
      continue

    const proxyDef = getProxyDef(script, scriptByKey)
    if (!proxyDef?.domains?.length)
      continue

    configs[script.registryKey] = {
      domains: proxyDef.domains.map(d => typeof d === 'string' ? d : d.domain),
      privacy: proxyDef.privacy || { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false },
      autoInject: proxyDef.autoInject ? resolveAutoInject(proxyDef.autoInject) : undefined,
      sdkPatches: proxyDef.sdkPatches,
    }
  }

  return configs
}
