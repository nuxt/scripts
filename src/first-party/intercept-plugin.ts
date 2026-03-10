import type { InterceptRule } from './types'

/**
 * Generate the client-side intercept plugin contents.
 * This plugin provides __nuxtScripts runtime helpers (sendBeacon, fetch, XMLHttpRequest, Image)
 * that route matching URLs through the first-party proxy. AST rewriting transforms
 * native API calls to use these wrappers at build time.
 */
export function generateInterceptPluginContents(interceptRules: InterceptRule[]): string {
  const rulesJson = JSON.stringify(interceptRules)
  return `export default defineNuxtPlugin({
  name: 'nuxt-scripts:intercept',
  enforce: 'pre',
  setup() {
    const rules = ${rulesJson};
    const origBeacon = typeof navigator !== 'undefined' && navigator.sendBeacon
      ? navigator.sendBeacon.bind(navigator)
      : () => false;
    const origFetch = globalThis.fetch.bind(globalThis);

    function rewriteUrl(url) {
      try {
        const parsed = new URL(url, location.origin);
        for (const rule of rules) {
          if (parsed.hostname === rule.pattern || parsed.hostname.endsWith('.' + rule.pattern)) {
            if (rule.pathPrefix && !parsed.pathname.startsWith(rule.pathPrefix)) continue;
            const path = rule.pathPrefix ? parsed.pathname.slice(rule.pathPrefix.length) : parsed.pathname;
            return location.origin + rule.target + (path.startsWith('/') ? '' : '/') + path + parsed.search;
          }
        }
      } catch {}
      return url;
    }

    // XMLHttpRequest wrapper — intercepts .open() to rewrite URL
    const OrigXHR = XMLHttpRequest;
    class ProxiedXHR extends OrigXHR {
      open() {
        const args = Array.from(arguments);
        if (typeof args[1] === 'string') args[1] = rewriteUrl(args[1]);
        return super.open.apply(this, args);
      }
    }
    // Image wrapper — intercepts .src setter to rewrite URL
    const OrigImage = Image;
    const origSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    function ProxiedImage(w, h) {
      const img = arguments.length === 2 ? new OrigImage(w, h)
        : arguments.length === 1 ? new OrigImage(w) : new OrigImage();
      if (origSrcDesc && origSrcDesc.set) {
        Object.defineProperty(img, 'src', {
          get() { return origSrcDesc.get.call(this); },
          set(v) { origSrcDesc.set.call(this, typeof v === 'string' ? rewriteUrl(v) : v); },
          configurable: true,
        });
      }
      return img;
    }

    globalThis.__nuxtScripts = {
      sendBeacon: (url, data) => origBeacon(rewriteUrl(url), data),
      fetch: (url, opts) => origFetch(typeof url === 'string' ? rewriteUrl(url) : url, opts),
      XMLHttpRequest: ProxiedXHR,
      Image: ProxiedImage,
    };
  },
})
`
}
