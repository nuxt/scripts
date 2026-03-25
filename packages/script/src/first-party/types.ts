import type { ProxyPrivacyInput } from '../runtime/server/utils/privacy'

/**
 * Proxy configuration for third-party scripts.
 */
export interface ProxyRewrite {
  /** Domain and path to match (e.g., 'www.google-analytics.com/g/collect') */
  from: string
  /** Local path to rewrite to (e.g., '/_scripts/p/ga/g/collect') */
  to: string
}

/**
 * Global privacy override for all first-party proxy requests.
 *
 * By default (`undefined`), each script uses its own privacy controls declared in the registry.
 * Setting this overrides all per-script defaults:
 *
 * - `true` - Full anonymize: anonymizes IP, normalizes User-Agent/language,
 *   generalizes screen/hardware/canvas/timezone data.
 *
 * - `false` - Passthrough: forwards headers and data, but strips sensitive
 *   auth/session headers (cookie, authorization).
 *
 * - `{ ip: false }` - Selective: override individual flags. Unset flags inherit
 *   from the per-script default.
 */
export type FirstPartyPrivacy = ProxyPrivacyInput

/**
 * Auto-inject configuration for scripts that need explicit endpoint config.
 * For example, PostHog needs `apiHost` set to the proxy endpoint, Plausible needs `endpoint`.
 */
export interface ProxyAutoInject {
  /** The config field name to set (e.g., 'apiHost', 'endpoint') */
  configField: string
  /** Compute the proxy endpoint value from the proxyPrefix and script config */
  computeValue: (proxyPrefix: string, config: Record<string, any>) => string
}

/**
 * Proxy configuration for third-party scripts.
 * Each supported script declares its domains, privacy controls, and optional SDK-specific hooks.
 *
 * The AST rewriter derives rewrite rules automatically from domains:
 *   { from: domain, to: proxyPrefix + '/' + domain }
 *
 * The runtime intercept plugin catches any remaining dynamic URLs at the
 * fetch/sendBeacon/XHR/Image call site.
 */
export interface ProxyConfig {
  /** Third-party domains to proxy. AST rewrites are derived automatically. */
  domains: string[]
  /**
   * Per-script privacy controls. Each script declares what it needs.
   * - `true` (default) = full anonymize: IP, UA, language, screen, timezone, hardware fingerprints
   * - `false` = passthrough (still strips sensitive auth headers)
   * - `{ ip: false }` = selective (unset flags default to `false`)
   *
   * Users can override per-script defaults via `proxy.privacy` in nuxt.config.
   */
  privacy: ProxyPrivacyInput
  /** Auto-inject proxy endpoint config into the script's SDK options */
  autoInject?: ProxyAutoInject
  /**
   * SDK-specific post-processing applied after AST URL rewriting.
   * Used for regex patches that can't be handled by the generic AST rewriter
   * (e.g., Fathom self-hosted detection, Rybbit host derivation).
   */
  postProcess?: (output: string, rewrites: ProxyRewrite[]) => string
}
