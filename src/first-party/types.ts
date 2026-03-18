import type { ProxyPrivacyInput } from '../runtime/server/utils/privacy'

export type { ProxyRewrite } from '../runtime/utils/pure'

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

export interface FirstPartyOptions {
  /**
   * Path prefix for proxy endpoints.
   *
   * Analytics collection requests are proxied through these paths.
   * For example, Google Analytics collection goes to `/_scripts/p/ga/g/collect`.
   * @default '/_scripts/p'
   * @example '/_tracking'
   */
  proxyPrefix?: string
  /**
   * Global privacy override for all proxied scripts.
   *
   * By default, each script uses its own privacy controls from the registry.
   * Set this to override all scripts at once:
   *
   * - `true` - Full anonymize for all scripts
   * - `false` - Passthrough for all scripts (still strips sensitive auth headers)
   * - `{ ip: false }` - Selective override (unset flags inherit per-script defaults)
   *
   * @default undefined
   */
  privacy?: FirstPartyPrivacy
}

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
 * Defines URL rewrites, route rules, privacy controls, auto-inject, and post-processing.
 * Each supported script has one ProxyConfig that is the single source of truth
 * for all first-party routing behavior.
 */
export interface ProxyConfig {
  /** URL rewrites to apply to downloaded script content */
  rewrite?: import('../runtime/utils/pure').ProxyRewrite[]
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
  /** Auto-inject proxy endpoint config into the script's SDK options */
  autoInject?: ProxyAutoInject
  /**
   * SDK-specific post-processing applied after AST URL rewriting.
   * Used for regex patches that can't be handled by the generic AST rewriter
   * (e.g., GA dynamic URL construction, Fathom self-hosted detection, Rybbit host derivation).
   */
  postProcess?: (output: string, rewrites: import('../runtime/utils/pure').ProxyRewrite[]) => string
}

export interface InterceptRule {
  /** Domain to match (exact match or implicit subdomain suffix match, e.g. google-analytics.com matches *.google-analytics.com) */
  pattern: string
  /** Path prefix to match and strip from the original URL (e.g., /tr for www.facebook.com/tr) */
  pathPrefix: string
  /** Local path prefix to rewrite to */
  target: string
}
