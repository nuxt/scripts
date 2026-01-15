/**
 * Proxy configuration for third-party scripts.
 * Defines URL rewrites and route rules for proxying collection endpoints.
 */
export interface ProxyRewrite {
  /** Domain to match and replace */
  from: string
  /** Local path to rewrite to */
  to: string
}

export interface ProxyConfig {
  /** URL rewrites to apply to downloaded script content */
  rewrite?: ProxyRewrite[]
  /** Nitro route rules to inject for proxying requests */
  routes?: Record<string, { proxy: string }>
}

/**
 * Builds proxy config with the configured collect prefix.
 */
function buildProxyConfig(collectPrefix: string) {
  return {
    googleAnalytics: {
      rewrite: [
        // Modern gtag.js uses www.google.com/g/collect
        { from: 'www.google.com/g/collect', to: `${collectPrefix}/ga/g/collect` },
        // Legacy endpoints still used by some scripts
        { from: 'www.google-analytics.com', to: `${collectPrefix}/ga-legacy` },
        { from: 'analytics.google.com', to: `${collectPrefix}/ga-legacy` },
      ],
      routes: {
        [`${collectPrefix}/ga/**`]: { proxy: 'https://www.google.com/**' },
        [`${collectPrefix}/ga-legacy/**`]: { proxy: 'https://www.google-analytics.com/**' },
      },
    },

    googleTagManager: {
      rewrite: [
        { from: 'www.googletagmanager.com', to: `${collectPrefix}/gtm` },
      ],
      routes: {
        [`${collectPrefix}/gtm/**`]: { proxy: 'https://www.googletagmanager.com/**' },
      },
    },

    metaPixel: {
      rewrite: [
        { from: 'connect.facebook.net', to: `${collectPrefix}/meta` },
        { from: 'www.facebook.com/tr', to: `${collectPrefix}/meta/tr` },
      ],
      routes: {
        [`${collectPrefix}/meta/**`]: { proxy: 'https://connect.facebook.net/**' },
      },
    },

    tiktokPixel: {
      rewrite: [
        { from: 'analytics.tiktok.com', to: `${collectPrefix}/tiktok` },
      ],
      routes: {
        [`${collectPrefix}/tiktok/**`]: { proxy: 'https://analytics.tiktok.com/**' },
      },
    },

    segment: {
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
      rewrite: [
        { from: 'tr.snapchat.com', to: `${collectPrefix}/snap` },
      ],
      routes: {
        [`${collectPrefix}/snap/**`]: { proxy: 'https://tr.snapchat.com/**' },
      },
    },

    redditPixel: {
      rewrite: [
        { from: 'alb.reddit.com', to: `${collectPrefix}/reddit` },
      ],
      routes: {
        [`${collectPrefix}/reddit/**`]: { proxy: 'https://alb.reddit.com/**' },
      },
    },

    clarity: {
      rewrite: [
        { from: 'www.clarity.ms', to: `${collectPrefix}/clarity` },
      ],
      routes: {
        [`${collectPrefix}/clarity/**`]: { proxy: 'https://www.clarity.ms/**' },
      },
    },

    hotjar: {
      rewrite: [
        { from: 'static.hotjar.com', to: `${collectPrefix}/hotjar` },
        { from: 'vars.hotjar.com', to: `${collectPrefix}/hotjar-vars` },
      ],
      routes: {
        [`${collectPrefix}/hotjar/**`]: { proxy: 'https://static.hotjar.com/**' },
        [`${collectPrefix}/hotjar-vars/**`]: { proxy: 'https://vars.hotjar.com/**' },
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

/**
 * Rewrite URLs in script content based on proxy config.
 */
export function rewriteScriptUrls(content: string, rewrites: ProxyRewrite[]): string {
  let result = content
  for (const { from, to } of rewrites) {
    // Rewrite various URL formats
    result = result
      .replaceAll(`"https://${from}`, `"${to}`)
      .replaceAll(`'https://${from}`, `'${to}`)
      .replaceAll(`\`https://${from}`, `\`${to}`)
      .replaceAll(`"http://${from}`, `"${to}`)
      .replaceAll(`'http://${from}`, `'${to}`)
      .replaceAll(`\`http://${from}`, `\`${to}`)
      .replaceAll(`"//${from}`, `"${to}`)
      .replaceAll(`'//${from}`, `'${to}`)
      .replaceAll(`\`//${from}`, `\`${to}`)
  }
  return result
}
