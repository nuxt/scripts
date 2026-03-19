import type { InterceptRule } from './types'

/**
 * Generate a Partytown `resolveUrl` function string from first-party intercept rules.
 * This is the web-worker equivalent of the intercept plugin — Partytown calls this
 * for every network request (fetch, XHR, sendBeacon, Image, script) made by worker-executed scripts.
 */
export function generatePartytownResolveUrl(interceptRules: InterceptRule[]): string {
  const rulesJson = JSON.stringify(interceptRules)
  // Return raw function body as a string — @nuxtjs/partytown inlines this into a <script> tag.
  // Must be self-contained with no external references.
  return `function(url, location, type) {
  var rules = ${rulesJson};
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (url.hostname === rule.pattern || url.hostname.endsWith('.' + rule.pattern)) {
      if (rule.pathPrefix && !url.pathname.startsWith(rule.pathPrefix)) continue;
      var path = rule.pathPrefix ? url.pathname.slice(rule.pathPrefix.length) : url.pathname;
      var newPath = rule.target + (path.startsWith('/') ? '' : '/') + path + url.search;
      return new URL(newPath, location.origin);
    }
  }
}`
}
