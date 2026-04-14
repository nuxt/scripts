/**
 * Generate the client-side intercept plugin contents.
 * This plugin provides __nuxtScripts runtime helpers (sendBeacon, fetch, XMLHttpRequest, Image)
 * that route matching URLs through the proxy. AST rewriting transforms
 * native API calls to use these wrappers at build time.
 *
 * Any non-same-origin URL is proxied through `proxyPrefix/<host><path>`.
 * No domain allowlist needed: only AST-rewritten third-party scripts call __nuxtScripts.
 */
export function generateInterceptPluginContents(proxyPrefix: string, options?: { testMode?: boolean }): string {
  const testMode = options?.testMode ?? false
  return `export default defineNuxtPlugin({
  name: 'nuxt-scripts:intercept',
  enforce: 'pre',
  setup() {
    const proxyPrefix = ${JSON.stringify(proxyPrefix)};
    const origBeacon = typeof navigator !== 'undefined' && navigator.sendBeacon
      ? navigator.sendBeacon.bind(navigator)
      : () => false;
    const origFetch = globalThis.fetch.bind(globalThis);

    function proxyUrl(url) {
      try {
        const parsed = new URL(url, location.origin);
        if (parsed.origin !== location.origin)
          return location.origin + proxyPrefix + '/' + parsed.host + parsed.pathname + parsed.search;
      } catch {}
      return url;
    }

    // XMLHttpRequest wrapper — intercepts .open() to rewrite URL
    const OrigXHR = XMLHttpRequest;
    class ProxiedXHR extends OrigXHR {
      open() {
        const args = Array.from(arguments);
        if (typeof args[1] === 'string') args[1] = proxyUrl(args[1]);
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
          set(v) { origSrcDesc.set.call(this, typeof v === 'string' ? proxyUrl(v) : v); },
          configurable: true,
        });
      }
      return img;
    }

    globalThis.__nuxtScripts = {${testMode
      ? `
      // Test mode: replace sendBeacon with fetch for immediate, observable requests
      sendBeacon: (url, data) => {
        const proxied = proxyUrl(url);
        origFetch(proxied, { method: 'POST', body: data, keepalive: true }).catch(() => {});
        return true;
      },`
      : `
      sendBeacon: (url, data) => origBeacon(proxyUrl(url), data),`}
      fetch: (url, opts) => {
        if (typeof url === 'string') return origFetch(proxyUrl(url), opts);
        if (url instanceof Request) return origFetch(new Request(proxyUrl(url.url), url), opts);
        return origFetch(url, opts);
      },
      XMLHttpRequest: ProxiedXHR,
      Image: ProxiedImage,
    };
  },
})
`
}
