/**
 * Proxy configuration for third-party scripts.
 */
export interface ProxyRewrite {
  /** Domain and path to match (e.g., 'www.google-analytics.com/g/collect') */
  from: string
  /** Local path to rewrite to (e.g., '/_scripts/c/ga/g/collect') */
  to: string
}
