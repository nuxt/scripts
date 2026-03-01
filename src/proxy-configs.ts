import type { ProxyRewrite } from './runtime/utils/pure'
import type { ProxyPrivacyInput } from './runtime/server/utils/privacy'

export type { ProxyRewrite }

/**
 * Proxy configuration for third-party scripts.
 * Defines URL rewrites and route rules for proxying collection endpoints.
 */
export interface ProxyConfig {
  /** URL rewrites to apply to downloaded script content */
  rewrite?: ProxyRewrite[]
  /** Nitro route rules to inject for proxying requests */
  routes?: Record<string, { proxy: string }>
  /**
   * Per-script privacy controls. Each script declares what it needs.
   * - `true` (default) = full anonymize: IP, UA, language, screen, timezone, hardware fingerprints
   * - `false` = passthrough (still strips sensitive auth headers)
   * - `{ ip: false }` = selective (unset flags default to `false`)
   *
   * Users can override per-script defaults via `firstParty.privacy` in nuxt.config.
   */
  privacy: ProxyPrivacyInput
}

/**
 * Builds proxy config with the configured collect prefix.
 */
function buildProxyConfig(collectPrefix: string) {
  return {
    googleAnalytics: {
      // GA4: screen/timezone/UA needed for device, time, and OS reports; rest anonymized safely
      privacy: { ip: true, userAgent: false, language: true, screen: false, timezone: false, hardware: true },
      rewrite: [
        // Modern gtag.js uses www.google.com/g/collect
        { from: 'www.google.com/g/collect', to: `${collectPrefix}/ga/g/collect` },
        // Older gtag.js constructs URLs dynamically: "https://"+(subdomain)+".google-analytics.com/g/collect"
        // We need to catch the suffix pattern with leading dot
        { from: '.google-analytics.com/g/collect', to: `${collectPrefix}/ga/g/collect` },
        { from: '.analytics.google.com/g/collect', to: `${collectPrefix}/ga/g/collect` },
        // Full domain patterns for static URLs
        { from: 'www.google-analytics.com/g/collect', to: `${collectPrefix}/ga/g/collect` },
        { from: 'analytics.google.com/g/collect', to: `${collectPrefix}/ga/g/collect` },
        // Legacy endpoints still used by some scripts
        { from: 'www.google-analytics.com', to: `${collectPrefix}/ga` },
        { from: 'analytics.google.com', to: `${collectPrefix}/ga` },
        // DoubleClick tracking (used by GA4 for ads/conversions)
        { from: 'stats.g.doubleclick.net/g/collect', to: `${collectPrefix}/ga/g/collect` },
        { from: 'stats.g.doubleclick.net', to: `${collectPrefix}/ga-dc` },
        // Google Ads/Syndication tracking
        { from: 'pagead2.googlesyndication.com', to: `${collectPrefix}/ga-syn` },
        { from: 'www.googleadservices.com', to: `${collectPrefix}/ga-ads` },
        { from: 'googleads.g.doubleclick.net', to: `${collectPrefix}/ga-gads` },
      ],
      routes: {
        [`${collectPrefix}/ga/**`]: { proxy: 'https://www.google-analytics.com/**' },
        [`${collectPrefix}/ga-dc/**`]: { proxy: 'https://stats.g.doubleclick.net/**' },
        [`${collectPrefix}/ga-syn/**`]: { proxy: 'https://pagead2.googlesyndication.com/**' },
        [`${collectPrefix}/ga-ads/**`]: { proxy: 'https://www.googleadservices.com/**' },
        [`${collectPrefix}/ga-gads/**`]: { proxy: 'https://googleads.g.doubleclick.net/**' },
      },
    },

    googleTagManager: {
      // GTM: container only, passes data through — downstream tags have their own privacy
      privacy: { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false },
      rewrite: [
        { from: 'www.googletagmanager.com', to: `${collectPrefix}/gtm` },
      ],
      routes: {
        [`${collectPrefix}/gtm/**`]: { proxy: 'https://www.googletagmanager.com/**' },
      },
    },

    metaPixel: {
      // Meta: untrusted ad network — full anonymization
      privacy: { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true },
      rewrite: [
        // SDK script loading
        { from: 'connect.facebook.net', to: `${collectPrefix}/meta` },
        // Tracking pixel endpoint (www and non-www)
        { from: 'www.facebook.com/tr', to: `${collectPrefix}/meta-tr` },
        { from: 'facebook.com/tr', to: `${collectPrefix}/meta-tr` },
        // Additional Meta tracking domains
        { from: 'pixel.facebook.com', to: `${collectPrefix}/meta-px` },
        { from: 'www.facebook.com/plugins', to: `${collectPrefix}/meta-plugins` },
      ],
      routes: {
        [`${collectPrefix}/meta/**`]: { proxy: 'https://connect.facebook.net/**' },
        [`${collectPrefix}/meta-tr/**`]: { proxy: 'https://www.facebook.com/tr/**' },
        [`${collectPrefix}/meta-px/**`]: { proxy: 'https://pixel.facebook.com/**' },
        [`${collectPrefix}/meta-plugins/**`]: { proxy: 'https://www.facebook.com/plugins/**' },
      },
    },

    tiktokPixel: {
      // TikTok: untrusted ad network — full anonymization
      privacy: { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true },
      rewrite: [
        { from: 'analytics.tiktok.com', to: `${collectPrefix}/tiktok` },
      ],
      routes: {
        [`${collectPrefix}/tiktok/**`]: { proxy: 'https://analytics.tiktok.com/**' },
      },
    },

    segment: {
      // Segment: trusted data pipeline — needs maximum fidelity for downstream destinations
      privacy: { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false },
      rewrite: [
        { from: 'api.segment.io', to: `${collectPrefix}/segment` },
        { from: 'cdn.segment.com', to: `${collectPrefix}/segment-cdn` },
      ],
      routes: {
        [`${collectPrefix}/segment/**`]: { proxy: 'https://api.segment.io/**' },
        [`${collectPrefix}/segment-cdn/**`]: { proxy: 'https://cdn.segment.com/**' },
      },
    },

    xPixel: {
      // X/Twitter: untrusted ad network — full anonymization
      privacy: { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true },
      rewrite: [
        { from: 'analytics.twitter.com', to: `${collectPrefix}/x` },
        { from: 't.co', to: `${collectPrefix}/x-t` },
      ],
      routes: {
        [`${collectPrefix}/x/**`]: { proxy: 'https://analytics.twitter.com/**' },
        [`${collectPrefix}/x-t/**`]: { proxy: 'https://t.co/**' },
      },
    },

    snapchatPixel: {
      // Snapchat: untrusted ad network — full anonymization
      privacy: { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true },
      rewrite: [
        { from: 'tr.snapchat.com', to: `${collectPrefix}/snap` },
      ],
      routes: {
        [`${collectPrefix}/snap/**`]: { proxy: 'https://tr.snapchat.com/**' },
      },
    },

    redditPixel: {
      // Reddit: untrusted ad network — full anonymization
      privacy: { ip: true, userAgent: true, language: true, screen: true, timezone: true, hardware: true },
      rewrite: [
        { from: 'alb.reddit.com', to: `${collectPrefix}/reddit` },
      ],
      routes: {
        [`${collectPrefix}/reddit/**`]: { proxy: 'https://alb.reddit.com/**' },
      },
    },

    clarity: {
      // Clarity: screen/UA/timezone needed for heatmaps and device filtering; rest anonymized
      privacy: { ip: true, userAgent: false, language: true, screen: false, timezone: false, hardware: true },
      rewrite: [
        // Main clarity domain
        { from: 'www.clarity.ms', to: `${collectPrefix}/clarity` },
        // Script loader (the actual SDK is loaded from here)
        { from: 'scripts.clarity.ms', to: `${collectPrefix}/clarity-scripts` },
        // Data collection endpoint
        { from: 'd.clarity.ms', to: `${collectPrefix}/clarity-data` },
        // Event collection endpoint
        { from: 'e.clarity.ms', to: `${collectPrefix}/clarity-events` },
      ],
      routes: {
        [`${collectPrefix}/clarity/**`]: { proxy: 'https://www.clarity.ms/**' },
        [`${collectPrefix}/clarity-scripts/**`]: { proxy: 'https://scripts.clarity.ms/**' },
        [`${collectPrefix}/clarity-data/**`]: { proxy: 'https://d.clarity.ms/**' },
        [`${collectPrefix}/clarity-events/**`]: { proxy: 'https://e.clarity.ms/**' },
      },
    },

    posthog: {
      // No rewrites needed - PostHog uses NPM mode, SDK URLs are set via api_host config
      // PostHog: needs real IP for GeoIP enrichment + feature flag targeting
      privacy: { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false },
      routes: {
        // US region
        [`${collectPrefix}/ph/static/**`]: { proxy: 'https://us-assets.i.posthog.com/static/**' },
        [`${collectPrefix}/ph/**`]: { proxy: 'https://us.i.posthog.com/**' },
        // EU region
        [`${collectPrefix}/ph-eu/static/**`]: { proxy: 'https://eu-assets.i.posthog.com/static/**' },
        [`${collectPrefix}/ph-eu/**`]: { proxy: 'https://eu.i.posthog.com/**' },
      },
    },

    hotjar: {
      // Hotjar: screen/UA/timezone needed for heatmaps and device segmentation; rest anonymized
      privacy: { ip: true, userAgent: false, language: true, screen: false, timezone: false, hardware: true },
      rewrite: [
        // Static assets
        { from: 'static.hotjar.com', to: `${collectPrefix}/hotjar` },
        // Script loader (bootstrap script loads the main SDK from here)
        { from: 'script.hotjar.com', to: `${collectPrefix}/hotjar-script` },
        // Configuration/variables
        { from: 'vars.hotjar.com', to: `${collectPrefix}/hotjar-vars` },
        // Data ingestion endpoint
        { from: 'in.hotjar.com', to: `${collectPrefix}/hotjar-in` },
        // Video capture
        { from: 'vc.hotjar.com', to: `${collectPrefix}/hotjar-vc` },
        // Metrics/telemetry
        { from: 'metrics.hotjar.io', to: `${collectPrefix}/hotjar-metrics` },
        // Insights (ContentSquare integration)
        { from: 'insights.hotjar.com', to: `${collectPrefix}/hotjar-insights` },
      ],
      routes: {
        [`${collectPrefix}/hotjar/**`]: { proxy: 'https://static.hotjar.com/**' },
        [`${collectPrefix}/hotjar-script/**`]: { proxy: 'https://script.hotjar.com/**' },
        [`${collectPrefix}/hotjar-vars/**`]: { proxy: 'https://vars.hotjar.com/**' },
        [`${collectPrefix}/hotjar-in/**`]: { proxy: 'https://in.hotjar.com/**' },
        [`${collectPrefix}/hotjar-vc/**`]: { proxy: 'https://vc.hotjar.com/**' },
        [`${collectPrefix}/hotjar-metrics/**`]: { proxy: 'https://metrics.hotjar.io/**' },
        [`${collectPrefix}/hotjar-insights/**`]: { proxy: 'https://insights.hotjar.com/**' },
      },
    },
  } satisfies Record<string, ProxyConfig>
}

export type ProxyConfigKey = keyof ReturnType<typeof buildProxyConfig>

/**
 * Get proxy config for a specific script.
 */
export function getProxyConfig(key: string, collectPrefix: string): ProxyConfig | undefined {
  const configs = buildProxyConfig(collectPrefix)
  return configs[key as ProxyConfigKey]
}

/**
 * Get all proxy configs.
 */
export function getAllProxyConfigs(collectPrefix: string): Record<string, ProxyConfig> {
  return buildProxyConfig(collectPrefix)
}

export interface InterceptRule {
  /** Domain pattern to match (supports wildcards like *.google-analytics.com) */
  pattern: string
  /** Path prefix to match and strip from the original URL (e.g., /tr for www.facebook.com/tr) */
  pathPrefix: string
  /** Local path prefix to rewrite to */
  target: string
}

/**
 * Get intercept rules from all proxy configs.
 * These rules are embedded in the __nuxtScripts client plugin to rewrite
 * outbound fetch/sendBeacon URLs through the first-party proxy.
 */
export function getInterceptRules(collectPrefix: string): InterceptRule[] {
  const configs = buildProxyConfig(collectPrefix)
  const rules: InterceptRule[] = []

  // Extract unique domain -> target mappings from route rules
  for (const config of Object.values(configs)) {
    if (!config.routes)
      continue
    for (const [localPath, { proxy }] of Object.entries(config.routes)) {
      // Extract domain and path prefix from proxy URL
      // e.g., "https://www.facebook.com/tr/**" -> domain="www.facebook.com", pathPrefix="/tr"
      // e.g., "https://connect.facebook.net/**" -> domain="connect.facebook.net", pathPrefix=""
      const match = proxy.match(/^https?:\/\/([^/]+)(\/.*)?\/\*\*$/)
      if (match?.[1]) {
        const domain = match[1]
        // Path prefix is everything between domain and /** (e.g., /tr), empty if none
        const pathPrefix = match[2] || ''
        // Extract target prefix: "/_proxy/meta-tr/**" -> "/_proxy/meta-tr"
        const target = localPath.replace(/\/\*\*$/, '')
        rules.push({ pattern: domain, pathPrefix, target })
      }
    }
  }

  return rules
}
