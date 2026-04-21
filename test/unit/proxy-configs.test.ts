import type { ProxyRewrite } from '../../packages/script/src/runtime/types'
import { describe, expect, it } from 'vitest'
import { rewriteScriptUrlsAST } from '../../packages/script/src/plugins/rewrite-ast'
import { buildProxyConfigsFromRegistry, registry } from '../../packages/script/src/registry'

let _proxyConfigs: ReturnType<typeof buildProxyConfigsFromRegistry> | undefined
async function getProxyConfigs() {
  if (!_proxyConfigs)
    _proxyConfigs = buildProxyConfigsFromRegistry(await registry())
  return _proxyConfigs
}

const fn = (c: string, r: ProxyRewrite[]) => rewriteScriptUrlsAST(c, 'test.js', r)

describe('proxy configs', () => {
  describe('rewriteScriptUrlsAST', () => {
    it('rewrites https URLs with double quotes', () => {
      const input = `x("https://www.google-analytics.com/g/collect")`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`x(self.location.origin+"/_scripts/c/ga/g/collect")`)
    })

    it('rewrites https URLs with single quotes', () => {
      const input = `url='https://www.google-analytics.com/analytics.js'`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`url=self.location.origin+'/_scripts/c/ga/analytics.js'`)
    })

    it('rewrites https URLs with backticks', () => {
      const input = 'const u=`https://www.google-analytics.com/collect`'
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe('const u=self.location.origin+`/_scripts/c/ga/collect`')
    })

    it('rewrites template literals with expressions', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const input = 'const u=`https://www.google-analytics.com/collect?id=${id}`'
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      // eslint-disable-next-line no-template-curly-in-string
      expect(output).toBe('const u=self.location.origin+`/_scripts/c/ga/collect?id=${id}`')
    })

    it('rewrites template literals with multiple expressions', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const input = 'fetch(`https://analytics.tiktok.com/api?id=${id}&v=${ver}`)'
      const output = fn(input, [
        { from: 'analytics.tiktok.com', to: '/_scripts/c/tiktok' },
      ])
      // eslint-disable-next-line no-template-curly-in-string
      expect(output).toBe('__nuxtScripts.fetch(self.location.origin+`/_scripts/c/tiktok/api?id=${id}&v=${ver}`)')
    })

    it('does not rewrite template literals with expressions when no match', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const input = 'const u=`https://example.com/api?id=${id}`'
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(input)
    })

    it('rewrites protocol-relative URLs', () => {
      const input = `"//www.google-analytics.com/analytics.js"`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`self.location.origin+"/_scripts/c/ga/analytics.js"`)
    })

    it('rewrites http URLs', () => {
      const input = `"http://www.google-analytics.com/analytics.js"`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`self.location.origin+"/_scripts/c/ga/analytics.js"`)
    })

    it('handles multiple rewrites in single content', () => {
      const input = `
        x("https://www.google-analytics.com/g/collect");
        x("https://analytics.google.com/collect");
      `
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
        { from: 'analytics.google.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toContain(`self.location.origin+"/_scripts/c/ga/g/collect"`)
      expect(output).toContain(`self.location.origin+"/_scripts/c/ga/collect"`)
    })

    it('handles GTM URLs', () => {
      const input = `src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"`
      const output = fn(input, [
        { from: 'www.googletagmanager.com', to: '/_scripts/c/gtm' },
      ])
      expect(output).toBe(`src=self.location.origin+"/_scripts/c/gtm/gtm.js?id=GTM-XXXX"`)
    })

    it('handles Meta Pixel URLs', () => {
      const input = `"https://connect.facebook.net/en_US/fbevents.js"`
      const output = fn(input, [
        { from: 'connect.facebook.net', to: '/_scripts/c/meta' },
      ])
      expect(output).toBe(`self.location.origin+"/_scripts/c/meta/en_US/fbevents.js"`)
    })

    it('does not rewrite bare domain strings without fromPath', () => {
      const input = `"https://"+e+"analytics.google.com/"+"g/collect"`
      const output = fn(input, [
        { from: 'analytics.google.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toContain(`"analytics.google.com/"`)
    })

    it('does not rewrite bare suffix-matched domain strings without fromPath', () => {
      const input = `"https://"+e+".google-analytics.com/"+"g/collect"`
      const output = fn(input, [
        { from: '.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toContain(`".google-analytics.com/"`)
    })

    it('returns unmodified content when no matches', () => {
      const input = `var u="https://example.com/api"`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(input)
    })

    it('preserves trailing slash in URL rewrites', () => {
      const input = `"https://www.google-analytics.com/"`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toContain('/_scripts/c/ga/')
    })

    it('does not rewrite bare hostname in dynamic URL construction', () => {
      const input = `var h="www.google-analytics.com";x("https://"+h+"/g/collect")`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toContain(`"www.google-analytics.com"`)
      expect(output).toBe(input)
    })

    it('would have caused TypeError from new URL() without absolute URL', () => {
      const relativeUrl = '/_scripts/c/tiktok/api/v2/pixel/act'
      expect(() => new URL(relativeUrl)).toThrow()

      const input = `var url="https://analytics.tiktok.com/api/v2/pixel/act"`
      const output = fn(input, [
        { from: 'analytics.tiktok.com', to: '/_scripts/c/tiktok' },
      ])
      expect(output).toContain('self.location.origin+')
    })

    it('uses expression for URL as object value', () => {
      const input = `{endpoint:"https://analytics.tiktok.com/api/v2/pixel"}`
      const output = fn(input, [
        { from: 'analytics.tiktok.com', to: '/_scripts/c/tiktok' },
      ])
      expect(output).toContain(`self.location.origin+"/_scripts/c/tiktok/api/v2/pixel"`)
    })
  })

  describe('rewriteScriptUrlsAST — property key context', () => {
    const fn = (c: string, r: ProxyRewrite[]) => rewriteScriptUrlsAST(c, 'test.js', r)

    it('keeps URL as string literal when used as object property key', () => {
      const input = `var x={"https://www.googletagmanager.com/collect":handler}`
      const output = fn(input, [
        { from: 'www.googletagmanager.com', to: '/_scripts/c/gtm' },
      ])
      expect(output).toBe(`var x={"/_scripts/c/gtm/collect":handler}`)
      expect(output).not.toContain('self.location.origin')
    })

    it('keeps URL as string literal in multi-key object', () => {
      const input = `var x={a:1,"https://www.google-analytics.com/g/collect":fn,b:2}`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`var x={a:1,"/_scripts/c/ga/g/collect":fn,b:2}`)
      expect(output).not.toContain('self.location.origin')
    })

    it('uses expression for URL in ternary operator', () => {
      const input = `cond?"https://www.google-analytics.com/collect":"fallback"`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`cond?self.location.origin+"/_scripts/c/ga/collect":"fallback"`)
    })

    it('handles mixed property key and expression contexts', () => {
      const input = `var m={"https://www.google-analytics.com/collect":1};x("https://www.google-analytics.com/g/collect")`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toContain(`"/_scripts/c/ga/collect":1`)
      expect(output).toContain(`x(self.location.origin+"/_scripts/c/ga/g/collect")`)
    })

    it('keeps URL as string literal in switch-case', () => {
      const input = `switch(x){case "https://analytics.tiktok.com/api":break}`
      const output = fn(input, [
        { from: 'analytics.tiktok.com', to: '/_scripts/c/tiktok' },
      ])
      expect(output).toContain(`"/_scripts/c/tiktok/api"`)
    })

    it('handles GTM endpoint map pattern', () => {
      const input = `var Yv={"https://www.googletagmanager.com/g/collect":function(a){return a},"https://www.google-analytics.com/g/collect":function(b){return b}}`
      const output = fn(input, [
        { from: 'www.googletagmanager.com', to: '/_scripts/c/gtm' },
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).not.toContain('self.location.origin')
      expect(output).toContain(`"/_scripts/c/gtm/g/collect":function`)
      expect(output).toContain(`"/_scripts/c/ga/g/collect":function`)
      // eslint-disable-next-line no-new-func
      expect(() => new Function(output)).not.toThrow()
    })
  })

  describe('rewriteScriptUrlsAST — API call rewriting', () => {
    it('rewrites navigator.sendBeacon to __nuxtScripts.sendBeacon', () => {
      const input = `navigator.sendBeacon("https://example.com/collect", data)`
      const output = fn(input, [])
      expect(output).toBe(`__nuxtScripts.sendBeacon("https://example.com/collect", data)`)
    })

    it('rewrites bare fetch to __nuxtScripts.fetch', () => {
      const input = `fetch("https://example.com/api", {method:"POST"})`
      const output = fn(input, [])
      expect(output).toBe(`__nuxtScripts.fetch("https://example.com/api", {method:"POST"})`)
    })

    it('rewrites window.fetch to __nuxtScripts.fetch', () => {
      const input = `window.fetch("https://example.com/api")`
      const output = fn(input, [])
      expect(output).toBe(`__nuxtScripts.fetch("https://example.com/api")`)
    })

    it('rewrites self.fetch to __nuxtScripts.fetch', () => {
      const input = `self.fetch("https://example.com/api")`
      const output = fn(input, [])
      expect(output).toBe(`__nuxtScripts.fetch("https://example.com/api")`)
    })

    it('rewrites globalThis.fetch to __nuxtScripts.fetch', () => {
      const input = `globalThis.fetch(url, opts)`
      const output = fn(input, [])
      expect(output).toBe(`__nuxtScripts.fetch(url, opts)`)
    })

    it('combines URL rewriting with API call rewriting', () => {
      const input = `navigator.sendBeacon("https://www.google-analytics.com/g/collect", payload)`
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`__nuxtScripts.sendBeacon(self.location.origin+"/_scripts/c/ga/g/collect", payload)`)
    })

    it('does not rewrite non-fetch member expressions', () => {
      const input = `obj.fetch("url")`
      const output = fn(input, [])
      expect(output).toBe(input)
    })

    it('rewrites computed navigator["sendBeacon"] via scope resolution', () => {
      const input = `navigator["sendBeacon"]("url", data)`
      const output = fn(input, [])
      expect(output).toBe(`__nuxtScripts.sendBeacon("url", data)`)
    })

    it('does not rewrite fetch as a reference (not a call)', () => {
      const input = `const f = fetch`
      const output = fn(input, [])
      expect(output).toBe(input)
    })

    it('does not rewrite navigator.sendBeacon as a reference', () => {
      const input = `const b = navigator.sendBeacon`
      const output = fn(input, [])
      expect(output).toBe(input)
    })

    it('rewrites multiple API calls in one script', () => {
      const input = `navigator.sendBeacon(u1,d1);fetch(u2);window.fetch(u3)`
      const output = fn(input, [])
      expect(output).toBe(`__nuxtScripts.sendBeacon(u1,d1);__nuxtScripts.fetch(u2);__nuxtScripts.fetch(u3)`)
    })

    it('rewrites fetch inside nested callbacks', () => {
      const input = `setTimeout(()=>{fetch(url)},0)`
      const output = fn(input, [])
      expect(output).toBe(`setTimeout(()=>{__nuxtScripts.fetch(url)},0)`)
    })

    it('does not rewrite navigator.geolocation or other navigator methods', () => {
      const input = `navigator.geolocation.getCurrentPosition(cb)`
      const output = fn(input, [])
      expect(output).toBe(input)
    })
  })

  describe('proxy config lookup', () => {
    it('returns proxy config for googleAnalytics', async () => {
      const config = (await getProxyConfigs()).googleAnalytics
      expect(config).toBeDefined()
      expect(config?.domains).toContain('www.google-analytics.com')
      expect(config?.domains).toContain('analytics.google.com')
    })

    it('does not return proxy config for googleTagManager (removed: dynamic script loading)', async () => {
      const config = (await getProxyConfigs()).googleTagManager
      expect(config).toBeUndefined()
    })

    it('returns proxy config for metaPixel', async () => {
      const config = (await getProxyConfigs()).metaPixel
      expect(config).toBeDefined()
      expect(config?.domains).toContain('connect.facebook.net')
    })

    it('returns proxy config for plausibleAnalytics', async () => {
      const config = (await getProxyConfigs()).plausibleAnalytics
      expect(config).toBeDefined()
      expect(config?.domains).toContain('plausible.io')
    })

    it('returns config domain fields for providers with custom hosts', async () => {
      const configs = await getProxyConfigs()
      expect(configs.matomoAnalytics?.configDomainFields).toEqual(['matomoUrl', 'trackerUrl'])
      expect(configs.vercelAnalytics?.configDomainFields).toEqual(['endpoint'])
      expect(configs.databuddyAnalytics?.configDomainFields).toEqual(['scriptUrl'])
    })

    it('returns proxy config for cloudflareWebAnalytics', async () => {
      const config = (await getProxyConfigs()).cloudflareWebAnalytics
      expect(config).toBeDefined()
      expect(config?.domains).toContain('static.cloudflareinsights.com')
      expect(config?.domains).toContain('cloudflareinsights.com')
    })

    it('returns proxy config for rybbitAnalytics', async () => {
      const config = (await getProxyConfigs()).rybbitAnalytics
      expect(config).toBeDefined()
      expect(config?.domains).toContain('app.rybbit.io')
    })

    it('returns proxy config for umamiAnalytics', async () => {
      const config = (await getProxyConfigs()).umamiAnalytics
      expect(config).toBeDefined()
      expect(config?.domains).toContain('cloud.umami.is')
    })

    it('returns proxy config for databuddyAnalytics', async () => {
      const config = (await getProxyConfigs()).databuddyAnalytics
      expect(config).toBeDefined()
      expect(config?.domains).toContain('cdn.databuddy.cc')
      expect(config?.domains).toContain('basket.databuddy.cc')
    })

    it('does not return proxy config for fathomAnalytics (removed: see #720, bot-detection flags proxied traffic)', async () => {
      const config = (await getProxyConfigs()).fathomAnalytics
      expect(config).toBeUndefined()
    })

    it('returns proxy config for intercom', async () => {
      const config = (await getProxyConfigs()).intercom
      expect(config).toBeDefined()
      expect(config?.domains).toContain('widget.intercom.io')
      expect(config?.domains).toContain('api-iam.intercom.io')
      expect(config?.domains).toContain('api-iam.eu.intercom.io')
      expect(config?.domains).toContain('api-iam.au.intercom.io')
      expect(config?.privacy.ip).toBe(true)
    })

    it('does not return proxy config for crisp (removed: SDK loads secondary scripts)', async () => {
      const config = (await getProxyConfigs()).crisp
      expect(config).toBeUndefined()
    })

    it('returns proxy config for vercelAnalytics', async () => {
      const config = (await getProxyConfigs()).vercelAnalytics
      expect(config).toBeDefined()
      expect(config?.domains).toContain('va.vercel-scripts.com')
    })

    it('returns undefined for unsupported scripts', async () => {
      const config = (await getProxyConfigs() as Record<string, any>).unknownScript
      expect(config).toBeUndefined()
    })
  })

  describe('getProxyConfigs', () => {
    it('returns all proxy configs (excluding removed: GTM, Segment, Crisp, Fathom)', async () => {
      const configs = await getProxyConfigs()
      expect(configs).toHaveProperty('googleAnalytics')
      expect(configs).not.toHaveProperty('googleTagManager')
      expect(configs).toHaveProperty('metaPixel')
      expect(configs).toHaveProperty('tiktokPixel')
      expect(configs).not.toHaveProperty('segment')
      expect(configs).toHaveProperty('clarity')
      expect(configs).toHaveProperty('hotjar')
      expect(configs).toHaveProperty('xPixel')
      expect(configs).toHaveProperty('snapchatPixel')
      expect(configs).toHaveProperty('redditPixel')
      expect(configs).toHaveProperty('posthog')
      expect(configs).toHaveProperty('plausibleAnalytics')
      expect(configs).toHaveProperty('cloudflareWebAnalytics')
      expect(configs).toHaveProperty('rybbitAnalytics')
      expect(configs).toHaveProperty('umamiAnalytics')
      expect(configs).toHaveProperty('databuddyAnalytics')
      expect(configs).not.toHaveProperty('fathomAnalytics')
      expect(configs).toHaveProperty('intercom')
      expect(configs).not.toHaveProperty('crisp')
      expect(configs).toHaveProperty('vercelAnalytics')
      expect(configs).toHaveProperty('gravatar')
    })

    it('all configs have valid structure', async () => {
      const configs = await getProxyConfigs()
      const fullAnonymize = ['metaPixel', 'tiktokPixel', 'xPixel', 'snapchatPixel', 'redditPixel']
      const ipOnly = ['posthog', 'plausibleAnalytics', 'cloudflareWebAnalytics', 'rybbitAnalytics', 'umamiAnalytics', 'databuddyAnalytics', 'fathomAnalytics', 'vercelAnalytics', 'matomoAnalytics', 'carbonAds', 'intercom', 'lemonSqueezy', 'vimeoPlayer', 'youtubePlayer', 'gravatar']
      for (const [key, config] of Object.entries(configs)) {
        expect(config, `${key} should have domains`).toHaveProperty('domains')
        expect(Array.isArray(config.domains), `${key}.domains should be an array`).toBe(true)
        expect(config.domains.length, `${key}.domains should not be empty`).toBeGreaterThan(0)
        expect(config.privacy, `${key} should have privacy`).toBeDefined()
        expect(config.privacy, `${key}.privacy should not be null`).not.toBeNull()
        expect(typeof config.privacy, `${key}.privacy should be an object`).toBe('object')
        const privacyFlags = ['ip', 'userAgent', 'language', 'screen', 'timezone', 'hardware'] as const
        for (const flag of privacyFlags) {
          expect(typeof config.privacy[flag], `${key}.privacy.${flag} should be boolean`).toBe('boolean')
        }

        if (fullAnonymize.includes(key)) {
          expect(config.privacy, `${key} should be fully anonymized`).toEqual({
            ip: true,
            userAgent: true,
            language: true,
            screen: true,
            timezone: true,
            hardware: true,
          })
        }
        if (ipOnly.includes(key)) {
          expect(config.privacy.ip, `${key} should anonymize IP`).toBe(true)
          expect(config.privacy.userAgent, `${key} should not anonymize userAgent`).toBe(false)
          expect(config.privacy.language, `${key} should not anonymize language`).toBe(false)
          expect(config.privacy.screen, `${key} should not anonymize screen`).toBe(false)
          expect(config.privacy.timezone, `${key} should not anonymize timezone`).toBe(false)
          expect(config.privacy.hardware, `${key} should not anonymize hardware`).toBe(false)
        }
      }
    })
  })

  // Test the proxyUrl logic that runs in the __nuxtScripts client plugin.
  // Any non-same-origin URL is proxied through proxyPrefix/<host><path>.
  describe('runtime proxyUrl', () => {
    const ORIGIN = 'https://example.com'
    const PROXY_PREFIX = '/_proxy'

    function proxyUrl(url: string) {
      try {
        const parsed = new URL(url, ORIGIN)
        if (parsed.origin !== ORIGIN)
          return `${ORIGIN + PROXY_PREFIX}/${parsed.host}${parsed.pathname}${parsed.search}`
      }
      catch { /* invalid URL */ }
      return url
    }

    it('rewrites GA collect URL', () => {
      const result = proxyUrl('https://www.google-analytics.com/g/collect?v=2&tid=G-XXX')
      expect(result).toBe(`${ORIGIN}/_proxy/www.google-analytics.com/g/collect?v=2&tid=G-XXX`)
    })

    it('rewrites Meta tracking pixel URL', () => {
      const result = proxyUrl('https://www.facebook.com/tr?id=123&ev=PageView')
      expect(result).toBe(`${ORIGIN}/_proxy/www.facebook.com/tr?id=123&ev=PageView`)
    })

    it('rewrites GTM script URL', () => {
      const result = proxyUrl('https://www.googletagmanager.com/gtm.js?id=GTM-XXX')
      expect(result).toBe(`${ORIGIN}/_proxy/www.googletagmanager.com/gtm.js?id=GTM-XXX`)
    })

    it('rewrites TikTok pixel URL', () => {
      const result = proxyUrl('https://analytics.tiktok.com/api/v2/pixel/act')
      expect(result).toBe(`${ORIGIN}/_proxy/analytics.tiktok.com/api/v2/pixel/act`)
    })

    it('does not rewrite same-origin URLs', () => {
      const result = proxyUrl('/local/path')
      expect(result).toBe('/local/path')
    })

    it('passes through non-URL strings', () => {
      const val = 'not-a-url'
      expect(proxyUrl(val)).toBe(val)
    })

    it('rewrites any cross-origin URL', () => {
      const result = proxyUrl('https://cdn.example.com/script.js')
      expect(result).toBe(`${ORIGIN}/_proxy/cdn.example.com/script.js`)
    })

    it('rewrites subdomain URLs', () => {
      const result = proxyUrl('https://region1.google-analytics.com/g/collect')
      expect(result).toBe(`${ORIGIN}/_proxy/region1.google-analytics.com/g/collect`)
    })

    it('handles fetch with Request object (passthrough)', () => {
      const nonStringUrl = {} as any
      const result = typeof nonStringUrl === 'string' ? proxyUrl(nonStringUrl) : nonStringUrl
      expect(result).toBe(nonStringUrl)
    })
  })
})
