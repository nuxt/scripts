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
   * Path prefix for serving bundled scripts.
   *
   * This is where the downloaded and rewritten script files are served from.
   * @default '/_scripts/assets'
   * @example '/_analytics'
   */
  prefix?: string
  /**
   * Path prefix for collection/tracking proxy endpoints.
   *
   * Analytics collection requests are proxied through these paths.
   * For example, Google Analytics collection goes to `/_scripts/c/ga/g/collect`.
   * @default '/_scripts/c'
   * @example '/_tracking'
   */
  collectPrefix?: string
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
 * Proxy configuration for third-party scripts.
 * Defines URL rewrites and route rules for proxying collection endpoints.
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
}

export interface InterceptRule {
  /** Domain to match (exact match or implicit subdomain suffix match, e.g. google-analytics.com matches *.google-analytics.com) */
  pattern: string
  /** Path prefix to match and strip from the original URL (e.g., /tr for www.facebook.com/tr) */
  pathPrefix: string
  /** Local path prefix to rewrite to */
  target: string
}
