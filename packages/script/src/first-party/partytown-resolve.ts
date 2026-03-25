/**
 * Generate a Partytown `resolveUrl` function string for first-party proxying.
 * This is the web-worker equivalent of the intercept plugin — Partytown calls this
 * for every network request (fetch, XHR, sendBeacon, Image, script) made by worker-executed scripts.
 *
 * Any non-same-origin URL is proxied through `proxyPrefix/<host><path>`.
 */
export function generatePartytownResolveUrl(proxyPrefix: string): string {
  return `function(url, location, type) {
  if (url.origin !== location.origin) {
    return new URL(${JSON.stringify(proxyPrefix)} + '/' + url.host + url.pathname + url.search, location.origin);
  }
}`
}
