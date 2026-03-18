import type { RegistryScriptKey } from '../runtime/types'
import type { InterceptRule, ProxyConfig } from './types'

// SDK-specific regex patterns used in postProcess functions.
// These handle edge cases where third-party SDKs construct URLs dynamically
// in ways that can't be caught by the generic AST URL rewriter.

// GA4 dynamically constructs collect URLs: "https://"+(subdomain)+".google-analytics.com/g/collect"
const GA_COLLECT_RE = /([\w$])?"https:\/\/"\+\(.*?\)\+"\.google-analytics\.com\/g\/collect"/g
const GA_ANALYTICS_COLLECT_RE = /([\w$])?"https:\/\/"\+\(.*?\)\+"\.analytics\.google\.com\/g\/collect"/g

// Fathom SDK checks src.indexOf("cdn.usefathom.com") < 0 to detect self-hosted mode
const FATHOM_SELF_HOSTED_RE = /\.src\.indexOf\("cdn\.usefathom\.com"\)\s*<\s*0/

// Rybbit SDK derives API host from script src: e.split("/script.js")[0]
const RYBBIT_HOST_SPLIT_RE = /\w+\.split\(["']\/script\.js["']\)\[0\]/g

// Privacy presets — 4 profiles cover all 21 configs
const PRIVACY_NONE = { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false } as const
const PRIVACY_FULL = { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true } as const
const PRIVACY_HEATMAP = { ip: true, userAgent: false, language: true, screen: false, timezone: false, hardware: true } as const
const PRIVACY_IP_ONLY = { ip: true, userAgent: false, language: false, screen: false, timezone: false, hardware: false } as const

export { PRIVACY_FULL, PRIVACY_HEATMAP, PRIVACY_IP_ONLY, PRIVACY_NONE }

type DomainMapping = [domain: string, alias: string]

/**
 * Derive rewrite rules from domain mappings.
 */
function deriveRewrites(domains: DomainMapping[], proxyPrefix: string) {
  return domains.map(([domain, alias]) => ({
    from: domain,
    to: `${proxyPrefix}/${alias}`,
  }))
}

/**
 * Derive Nitro route rules from domain mappings.
 * Each unique alias gets one route: `prefix/alias/**` → `https://domain/**`
 */
function deriveRoutes(domains: DomainMapping[], proxyPrefix: string) {
  const routes: Record<string, { proxy: string }> = {}
  const seen = new Set<string>()
  for (const [domain, alias] of domains) {
    if (seen.has(alias))
      continue
    seen.add(alias)
    routes[`${proxyPrefix}/${alias}/**`] = { proxy: `https://${domain}/**` }
  }
  return routes
}

/**
 * Build a proxy config from domain mappings, deriving both rewrites and routes.
 * For configs needing extra rewrite patterns (suffix matches, path-specific) that
 * don't map to routes, pass them via extraRewrites.
 */
function fromDomains(
  domains: DomainMapping[],
  proxyPrefix: string,
  opts: Omit<ProxyConfig, 'rewrite' | 'routes'> & {
    extraRewrites?: { from: string, to: string }[]
  },
): ProxyConfig {
  const { extraRewrites, ...rest } = opts
  const rewrites = deriveRewrites(domains, proxyPrefix)
  if (extraRewrites) {
    for (const r of extraRewrites)
      rewrites.push({ from: r.from, to: `${proxyPrefix}/${r.to}` })
  }
  return { rewrite: rewrites, routes: deriveRoutes(domains, proxyPrefix), ...rest }
}

/**
 * Builds proxy config with the configured proxy prefix.
 * Keys match registry keys for direct lookup — no indirection layer needed.
 */
function buildProxyConfig(proxyPrefix: string) {
  return {
    googleAnalytics: fromDomains(
      [
        ['www.google-analytics.com', 'ga'],
        ['analytics.google.com', 'ga'],
        ['stats.g.doubleclick.net', 'ga-dc'],
        ['pagead2.googlesyndication.com', 'ga-syn'],
        ['www.googleadservices.com', 'ga-ads'],
        ['googleads.g.doubleclick.net', 'ga-gads'],
      ],
      proxyPrefix,
      {
        // GA4: screen/timezone/UA needed for device, time, and OS reports; rest anonymized safely
        privacy: PRIVACY_HEATMAP,
        extraRewrites: [
          // Modern gtag.js uses www.google.com/g/collect
          { from: 'www.google.com/g/collect', to: 'ga/g/collect' },
          // Suffix patterns for dynamically constructed URLs
          { from: '.google-analytics.com/g/collect', to: 'ga/g/collect' },
          { from: '.analytics.google.com/g/collect', to: 'ga/g/collect' },
          // Full domain + path patterns
          { from: 'www.google-analytics.com/g/collect', to: 'ga/g/collect' },
          { from: 'analytics.google.com/g/collect', to: 'ga/g/collect' },
          // DoubleClick collect endpoint
          { from: 'stats.g.doubleclick.net/g/collect', to: 'ga/g/collect' },
        ],
        // GA4 dynamically constructs collect URLs via string concatenation that can't be
        // caught by AST rewriting. These regex patches handle the remaining patterns.
        postProcess(output, rewrites) {
          const gaRewrite = rewrites.find(r => r.from.includes('google-analytics.com/g/collect'))
          if (gaRewrite) {
            output = output.replace(
              GA_COLLECT_RE,
              (_, prevChar) => `${prevChar ? `${prevChar} ` : ''}self.location.origin+"${gaRewrite.to}"`,
            )
            output = output.replace(
              GA_ANALYTICS_COLLECT_RE,
              (_, prevChar) => `${prevChar ? `${prevChar} ` : ''}self.location.origin+"${gaRewrite.to}"`,
            )
          }
          return output
        },
      },
    ),

    googleTagManager: fromDomains(
      [['www.googletagmanager.com', 'gtm']],
      proxyPrefix,
      { privacy: PRIVACY_NONE },
    ),

    metaPixel: fromDomains(
      [
        ['connect.facebook.net', 'meta'],
        ['www.facebook.com/tr', 'meta-tr'],
        ['facebook.com/tr', 'meta-tr'],
        ['pixel.facebook.com', 'meta-px'],
        ['www.facebook.com/plugins', 'meta-plugins'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_FULL },
    ),

    tiktokPixel: fromDomains(
      [['analytics.tiktok.com', 'tiktok']],
      proxyPrefix,
      { privacy: PRIVACY_FULL },
    ),

    segment: fromDomains(
      [
        ['api.segment.io', 'segment'],
        ['cdn.segment.com', 'segment-cdn'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_NONE },
    ),

    xPixel: fromDomains(
      [
        ['analytics.twitter.com', 'x'],
        ['static.ads-twitter.com', 'x-ads'],
        ['t.co', 'x-t'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_FULL },
    ),

    snapchatPixel: fromDomains(
      [
        ['sc-static.net', 'snap-cdn'],
        ['tr.snapchat.com', 'snap'],
        ['pixel.tapad.com', 'snap-tapad'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_FULL },
    ),

    redditPixel: fromDomains(
      [
        ['www.redditstatic.com', 'reddit-cdn'],
        ['alb.reddit.com', 'reddit'],
        ['pixel-config.reddit.com', 'reddit-cfg'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_FULL },
    ),

    clarity: fromDomains(
      [
        ['www.clarity.ms', 'clarity'],
        ['scripts.clarity.ms', 'clarity-scripts'],
        ['d.clarity.ms', 'clarity-data'],
        ['e.clarity.ms', 'clarity-events'],
        ['k.clarity.ms', 'clarity-collect'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_HEATMAP },
    ),

    posthog: {
      // No rewrites needed - PostHog uses NPM mode, SDK URLs are set via api_host config
      privacy: PRIVACY_NONE,
      routes: {
        // US region
        [`${proxyPrefix}/ph/static/**`]: { proxy: 'https://us-assets.i.posthog.com/static/**' },
        [`${proxyPrefix}/ph/**`]: { proxy: 'https://us.i.posthog.com/**' },
        // EU region
        [`${proxyPrefix}/ph-eu/static/**`]: { proxy: 'https://eu-assets.i.posthog.com/static/**' },
        [`${proxyPrefix}/ph-eu/**`]: { proxy: 'https://eu.i.posthog.com/**' },
      },
      autoInject: {
        configField: 'apiHost',
        computeValue: (proxyPrefix, config) => {
          const region = config.region || 'us'
          return region === 'eu'
            ? `${proxyPrefix}/ph-eu`
            : `${proxyPrefix}/ph`
        },
      },
    } satisfies ProxyConfig,

    hotjar: fromDomains(
      [
        ['static.hotjar.com', 'hotjar'],
        ['script.hotjar.com', 'hotjar-script'],
        ['vars.hotjar.com', 'hotjar-vars'],
        ['in.hotjar.com', 'hotjar-in'],
        ['vc.hotjar.com', 'hotjar-vc'],
        ['vc.hotjar.io', 'hotjar-vc'],
        ['metrics.hotjar.io', 'hotjar-metrics'],
        ['insights.hotjar.com', 'hotjar-insights'],
        ['ask.hotjar.io', 'hotjar-ask'],
        ['events.hotjar.io', 'hotjar-events'],
        ['identify.hotjar.com', 'hotjar-identify'],
        ['surveystats.hotjar.io', 'hotjar-surveys'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_HEATMAP },
    ),

    plausibleAnalytics: fromDomains(
      [['plausible.io', 'plausible']],
      proxyPrefix,
      {
        privacy: PRIVACY_NONE,
        autoInject: {
          configField: 'endpoint',
          computeValue: proxyPrefix => `${proxyPrefix}/plausible/api/event`,
        },
      },
    ),

    cloudflareWebAnalytics: fromDomains(
      [
        ['static.cloudflareinsights.com', 'cfwa'],
        ['cloudflareinsights.com', 'cfwa-beacon'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_NONE },
    ),

    rybbitAnalytics: fromDomains(
      [['app.rybbit.io', 'rybbit']],
      proxyPrefix,
      {
        privacy: PRIVACY_NONE,
        autoInject: {
          configField: 'analyticsHost',
          computeValue: proxyPrefix => `${proxyPrefix}/rybbit/api`,
        },
        // Rybbit SDK derives API host via `e.split("/script.js")[0]` from the script tag's
        // src attribute. When bundled, src becomes /_scripts/assets/<hash>.js so the split fails.
        postProcess(output, rewrites) {
          const rybbitRewrite = rewrites.find(r => r.from === 'app.rybbit.io')
          if (rybbitRewrite) {
            output = output.replace(
              RYBBIT_HOST_SPLIT_RE,
              `self.location.origin+"${rybbitRewrite.to}/api"`,
            )
          }
          return output
        },
      },
    ),

    umamiAnalytics: fromDomains(
      [['cloud.umami.is', 'umami']],
      proxyPrefix,
      {
        privacy: PRIVACY_NONE,
        extraRewrites: [
          { from: 'api-gateway.umami.dev', to: 'umami' },
        ],
        autoInject: {
          configField: 'hostUrl',
          computeValue: proxyPrefix => `${proxyPrefix}/umami`,
        },
      },
    ),

    databuddyAnalytics: fromDomains(
      [
        ['cdn.databuddy.cc', 'databuddy'],
        ['basket.databuddy.cc', 'databuddy-api'],
      ],
      proxyPrefix,
      {
        privacy: PRIVACY_NONE,
        autoInject: {
          configField: 'apiUrl',
          computeValue: proxyPrefix => `${proxyPrefix}/databuddy-api`,
        },
      },
    ),

    fathomAnalytics: fromDomains(
      [['cdn.usefathom.com', 'fathom']],
      proxyPrefix,
      {
        privacy: PRIVACY_NONE,
        // Fathom SDK checks if script src contains "cdn.usefathom.com" to detect self-hosted
        // mode, then overrides trackerUrl with the script host's root. After AST rewrite already
        // set trackerUrl to the proxy URL, neutralize this check so it doesn't override it.
        postProcess(output) {
          return output.replace(
            FATHOM_SELF_HOSTED_RE,
            '.src.indexOf("cdn.usefathom.com")<-1',
          )
        },
      },
    ),

    intercom: fromDomains(
      [
        ['widget.intercom.io', 'intercom'],
        ['api-iam.intercom.io', 'intercom-api'],
        ['api-iam.eu.intercom.io', 'intercom-api-eu'],
        ['api-iam.au.intercom.io', 'intercom-api-au'],
        ['js.intercomcdn.com', 'intercom-cdn'],
        ['downloads.intercomcdn.com', 'intercom-downloads'],
        ['video-messages.intercomcdn.com', 'intercom-video'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_IP_ONLY },
    ),

    crisp: fromDomains(
      [
        ['client.crisp.chat', 'crisp'],
        ['client.relay.crisp.chat', 'crisp-relay'],
        ['assets.crisp.chat', 'crisp-assets'],
        ['go.crisp.chat', 'crisp-go'],
        ['image.crisp.chat', 'crisp-image'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_IP_ONLY },
    ),

    vercelAnalytics: fromDomains(
      [['va.vercel-scripts.com', 'vercel']],
      proxyPrefix,
      { privacy: PRIVACY_NONE },
    ),

    gravatar: fromDomains(
      [
        ['secure.gravatar.com', 'gravatar'],
        ['gravatar.com/avatar', 'gravatar-avatar'],
      ],
      proxyPrefix,
      { privacy: PRIVACY_IP_ONLY },
    ),

    carbonAds: fromDomains(
      [['cdn.carbonads.com', 'carbon']],
      proxyPrefix,
      { privacy: PRIVACY_NONE },
    ),

    lemonSqueezy: fromDomains(
      [['assets.lemonsqueezy.com', 'lemonsqueezy']],
      proxyPrefix,
      { privacy: PRIVACY_NONE },
    ),

    matomoAnalytics: fromDomains(
      [['cdn.matomo.cloud', 'matomo']],
      proxyPrefix,
      { privacy: PRIVACY_NONE },
    ),

    stripe: fromDomains(
      [['js.stripe.com', 'stripe']],
      proxyPrefix,
      { privacy: PRIVACY_IP_ONLY },
    ),

    paypal: fromDomains(
      [['www.paypal.com', 'paypal']],
      proxyPrefix,
      { privacy: PRIVACY_IP_ONLY },
    ),

    youtubePlayer: fromDomains(
      [['www.youtube.com', 'youtube']],
      proxyPrefix,
      { privacy: PRIVACY_IP_ONLY },
    ),

    vimeoPlayer: fromDomains(
      [['player.vimeo.com', 'vimeo']],
      proxyPrefix,
      { privacy: PRIVACY_IP_ONLY },
    ),

    googleRecaptcha: {
      privacy: PRIVACY_IP_ONLY,
      rewrite: [
        { from: 'www.gstatic.com', to: `${proxyPrefix}/gstatic` },
        // www.google.com is shared with GA — only rewrite /recaptcha paths
        { from: 'www.google.com/recaptcha', to: `${proxyPrefix}/grecaptcha` },
        { from: 'www.recaptcha.net/recaptcha', to: `${proxyPrefix}/grecaptcha` },
      ],
      routes: {
        [`${proxyPrefix}/gstatic/**`]: { proxy: 'https://www.gstatic.com/**' },
        [`${proxyPrefix}/grecaptcha/**`]: { proxy: 'https://www.google.com/recaptcha/**' },
      },
    } satisfies ProxyConfig,

    googleSignIn: fromDomains(
      [['accounts.google.com', 'gsignin']],
      proxyPrefix,
      { privacy: PRIVACY_IP_ONLY },
    ),
  } satisfies Partial<Record<RegistryScriptKey, ProxyConfig>>
}

/**
 * Get all proxy configs.
 */
export function getAllProxyConfigs(proxyPrefix: string): Partial<Record<RegistryScriptKey, ProxyConfig>> {
  return buildProxyConfig(proxyPrefix)
}

const PROXY_URL_RE = /^https?:\/\/([^/]+)(\/.*)?\/\*\*$/
const ROUTE_WILDCARD_RE = /\/\*\*$/

/**
 * Convert route definitions into intercept rules for client-side URL rewriting.
 */
export function routesToInterceptRules(routes: Record<string, { proxy: string }>): InterceptRule[] {
  const rules: InterceptRule[] = []
  for (const [localPath, { proxy }] of Object.entries(routes)) {
    // Extract domain and path prefix from proxy URL
    // e.g., "https://www.facebook.com/tr/**" -> domain="www.facebook.com", pathPrefix="/tr"
    // e.g., "https://connect.facebook.net/**" -> domain="connect.facebook.net", pathPrefix=""
    const match = proxy.match(PROXY_URL_RE)
    if (match?.[1]) {
      const domain = match[1]
      const pathPrefix = match[2] || ''
      const target = localPath.replace(ROUTE_WILDCARD_RE, '')
      rules.push({ pattern: domain, pathPrefix, target })
    }
  }
  return rules
}
