import type { RegistryScriptKey } from '../runtime/types'
import type { ProxyConfig } from './types'

// SDK-specific regex patterns used in postProcess functions.
// Note: most dynamic URL construction is now handled by the runtime intercept plugin
// (which proxies any non-same-origin URL through __nuxtScripts wrappers).

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

/**
 * Builds proxy config with the configured proxy prefix.
 * Keys match registry keys for direct lookup — no indirection layer needed.
 *
 * Each config declares `domains` — the AST rewriter derives rewrite rules automatically
 * as `{ from: domain, to: proxyPrefix + '/' + domain }`. The runtime intercept plugin
 * catches any remaining dynamic URLs at the fetch/sendBeacon call site.
 */
function buildProxyConfig(proxyPrefix: string) {
  return {
    googleAnalytics: {
      domains: [
        'www.google-analytics.com',
        'analytics.google.com',
        'stats.g.doubleclick.net',
        'pagead2.googlesyndication.com',
        'www.googleadservices.com',
        'googleads.g.doubleclick.net',
      ],
      privacy: PRIVACY_HEATMAP,
    },

    googleTagManager: {
      domains: ['www.googletagmanager.com'],
      privacy: PRIVACY_NONE,
    },

    metaPixel: {
      domains: [
        'connect.facebook.net',
        'www.facebook.com',
        'facebook.com',
        'pixel.facebook.com',
      ],
      privacy: PRIVACY_FULL,
    },

    tiktokPixel: {
      domains: ['analytics.tiktok.com'],
      privacy: PRIVACY_FULL,
    },

    segment: {
      domains: ['api.segment.io', 'cdn.segment.com'],
      privacy: PRIVACY_NONE,
    },

    xPixel: {
      domains: ['analytics.twitter.com', 'static.ads-twitter.com', 't.co'],
      privacy: PRIVACY_FULL,
    },

    snapchatPixel: {
      domains: ['sc-static.net', 'tr.snapchat.com', 'pixel.tapad.com'],
      privacy: PRIVACY_FULL,
    },

    redditPixel: {
      domains: ['www.redditstatic.com', 'alb.reddit.com', 'pixel-config.reddit.com'],
      privacy: PRIVACY_FULL,
    },

    clarity: {
      domains: [
        'www.clarity.ms',
        'scripts.clarity.ms',
        'd.clarity.ms',
        'e.clarity.ms',
        'k.clarity.ms',
      ],
      privacy: PRIVACY_HEATMAP,
    },

    posthog: {
      domains: [
        'us-assets.i.posthog.com',
        'us.i.posthog.com',
        'eu-assets.i.posthog.com',
        'eu.i.posthog.com',
      ],
      privacy: PRIVACY_NONE,
      autoInject: {
        configField: 'apiHost',
        computeValue: (proxyPrefix, config) => {
          const region = config.region || 'us'
          const host = region === 'eu' ? 'eu.i.posthog.com' : 'us.i.posthog.com'
          return `${proxyPrefix}/${host}`
        },
      },
    },

    hotjar: {
      domains: [
        'static.hotjar.com',
        'script.hotjar.com',
        'vars.hotjar.com',
        'in.hotjar.com',
        'vc.hotjar.com',
        'vc.hotjar.io',
        'metrics.hotjar.io',
        'insights.hotjar.com',
        'ask.hotjar.io',
        'events.hotjar.io',
        'identify.hotjar.com',
        'surveystats.hotjar.io',
      ],
      privacy: PRIVACY_HEATMAP,
    },

    plausibleAnalytics: {
      domains: ['plausible.io'],
      privacy: PRIVACY_NONE,
      autoInject: {
        configField: 'endpoint',
        computeValue: proxyPrefix => `${proxyPrefix}/plausible.io/api/event`,
      },
    },

    cloudflareWebAnalytics: {
      domains: ['static.cloudflareinsights.com', 'cloudflareinsights.com'],
      privacy: PRIVACY_NONE,
    },

    rybbitAnalytics: {
      domains: ['app.rybbit.io'],
      privacy: PRIVACY_NONE,
      autoInject: {
        configField: 'analyticsHost',
        computeValue: proxyPrefix => `${proxyPrefix}/app.rybbit.io/api`,
      },
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

    umamiAnalytics: {
      domains: ['cloud.umami.is', 'api-gateway.umami.dev'],
      privacy: PRIVACY_NONE,
      autoInject: {
        configField: 'hostUrl',
        computeValue: proxyPrefix => `${proxyPrefix}/cloud.umami.is`,
      },
    },

    databuddyAnalytics: {
      domains: ['cdn.databuddy.cc', 'basket.databuddy.cc'],
      privacy: PRIVACY_NONE,
      autoInject: {
        configField: 'apiUrl',
        computeValue: proxyPrefix => `${proxyPrefix}/basket.databuddy.cc`,
      },
    },

    fathomAnalytics: {
      domains: ['cdn.usefathom.com'],
      privacy: PRIVACY_NONE,
      postProcess(output) {
        return output.replace(
          FATHOM_SELF_HOSTED_RE,
          '.src.indexOf("cdn.usefathom.com")<-1',
        )
      },
    },

    intercom: {
      domains: [
        'widget.intercom.io',
        'api-iam.intercom.io',
        'api-iam.eu.intercom.io',
        'api-iam.au.intercom.io',
        'js.intercomcdn.com',
        'downloads.intercomcdn.com',
        'video-messages.intercomcdn.com',
      ],
      privacy: PRIVACY_IP_ONLY,
    },

    crisp: {
      domains: [
        'client.crisp.chat',
        'client.relay.crisp.chat',
        'assets.crisp.chat',
        'go.crisp.chat',
        'image.crisp.chat',
      ],
      privacy: PRIVACY_IP_ONLY,
    },

    vercelAnalytics: {
      domains: ['va.vercel-scripts.com'],
      privacy: PRIVACY_NONE,
    },

    gravatar: {
      domains: ['secure.gravatar.com', 'gravatar.com'],
      privacy: PRIVACY_IP_ONLY,
    },

    carbonAds: {
      domains: ['cdn.carbonads.com'],
      privacy: PRIVACY_NONE,
    },

    lemonSqueezy: {
      domains: ['assets.lemonsqueezy.com'],
      privacy: PRIVACY_NONE,
    },

    matomoAnalytics: {
      domains: ['cdn.matomo.cloud'],
      privacy: PRIVACY_NONE,
    },

    // stripe, paypal: proxy: false in registry (need fingerprinting for fraud detection)

    youtubePlayer: {
      domains: ['www.youtube.com'],
      privacy: PRIVACY_IP_ONLY,
    },

    vimeoPlayer: {
      domains: ['player.vimeo.com'],
      privacy: PRIVACY_IP_ONLY,
    },

    // googleRecaptcha, googleSignIn: proxy: false in registry (need fingerprinting for bot detection / auth)
  } satisfies Partial<Record<RegistryScriptKey, ProxyConfig>>
}

/**
 * Get all proxy configs.
 */
export function getAllProxyConfigs(proxyPrefix: string): Partial<Record<RegistryScriptKey, ProxyConfig>> {
  return buildProxyConfig(proxyPrefix)
}
