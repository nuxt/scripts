import type { ProxyRewrite } from '../../src/runtime/utils/pure'
import { describe, expect, it } from 'vitest'
import { getAllProxyConfigs, routesToInterceptRules } from '../../src/first-party'
import { rewriteScriptUrlsAST } from '../../src/plugins/rewrite-ast'

const fn = (c: string, r: ProxyRewrite[]) => rewriteScriptUrlsAST(c, 'test.js', r)

function getInterceptRules(proxyPrefix: string) {
  const configs = getAllProxyConfigs(proxyPrefix)
  const allRoutes: Record<string, { proxy: string }> = {}
  for (const config of Object.values(configs)) {
    if (config.routes)
      Object.assign(allRoutes, config.routes)
  }
  return routesToInterceptRules(allRoutes)
}

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
      const input = 'const u=`https://www.google-analytics.com/collect?id=${id}`'
      const output = fn(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe('const u=self.location.origin+`/_scripts/c/ga/collect?id=${id}`')
    })

    it('rewrites template literals with multiple expressions', () => {
      const input = 'fetch(`https://analytics.tiktok.com/api?id=${id}&v=${ver}`)'
      const output = fn(input, [
        { from: 'analytics.tiktok.com', to: '/_scripts/c/tiktok' },
      ])
      expect(output).toBe('__nuxtScripts.fetch(self.location.origin+`/_scripts/c/tiktok/api?id=${id}&v=${ver}`)')
    })

    it('does not rewrite template literals with expressions when no match', () => {
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
    it('returns proxy config for googleAnalytics', () => {
      const config = getAllProxyConfigs('/_scripts/c').googleAnalytics
      expect(config).toBeDefined()
      expect(config?.rewrite).toBeDefined()
      expect(config?.routes).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'www.google.com/g/collect',
        to: '/_scripts/c/ga/g/collect',
      })
      expect(config?.rewrite).toContainEqual({
        from: 'www.google-analytics.com',
        to: '/_scripts/c/ga',
      })
    })

    it('returns proxy config for googleTagManager', () => {
      const config = getAllProxyConfigs('/_scripts/c').googleTagManager
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'www.googletagmanager.com',
        to: '/_scripts/c/gtm',
      })
    })

    it('returns proxy config for metaPixel', () => {
      const config = getAllProxyConfigs('/_scripts/c').metaPixel
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'connect.facebook.net',
        to: '/_scripts/c/meta',
      })
    })

    it('returns proxy config for plausibleAnalytics', () => {
      const config = getAllProxyConfigs('/_scripts/c').plausibleAnalytics
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'plausible.io',
        to: '/_scripts/c/plausible',
      })
    })

    it('returns proxy config for cloudflareWebAnalytics', () => {
      const config = getAllProxyConfigs('/_scripts/c').cloudflareWebAnalytics
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'static.cloudflareinsights.com',
        to: '/_scripts/c/cfwa',
      })
      expect(config?.rewrite).toContainEqual({
        from: 'cloudflareinsights.com',
        to: '/_scripts/c/cfwa-beacon',
      })
    })

    it('returns proxy config for rybbitAnalytics', () => {
      const config = getAllProxyConfigs('/_scripts/c').rybbitAnalytics
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'app.rybbit.io',
        to: '/_scripts/c/rybbit',
      })
    })

    it('returns proxy config for umamiAnalytics', () => {
      const config = getAllProxyConfigs('/_scripts/c').umamiAnalytics
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'cloud.umami.is',
        to: '/_scripts/c/umami',
      })
    })

    it('returns proxy config for databuddyAnalytics', () => {
      const config = getAllProxyConfigs('/_scripts/c').databuddyAnalytics
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'cdn.databuddy.cc',
        to: '/_scripts/c/databuddy',
      })
      expect(config?.rewrite).toContainEqual({
        from: 'basket.databuddy.cc',
        to: '/_scripts/c/databuddy-api',
      })
    })

    it('returns proxy config for fathomAnalytics', () => {
      const config = getAllProxyConfigs('/_scripts/c').fathomAnalytics
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'cdn.usefathom.com',
        to: '/_scripts/c/fathom',
      })
    })

    it('returns proxy config for intercom', () => {
      const config = getAllProxyConfigs('/_scripts/c').intercom
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'widget.intercom.io',
        to: '/_scripts/c/intercom',
      })
      expect(config?.rewrite).toContainEqual({
        from: 'api-iam.intercom.io',
        to: '/_scripts/c/intercom-api',
      })
      expect(config?.rewrite).toContainEqual({
        from: 'api-iam.eu.intercom.io',
        to: '/_scripts/c/intercom-api-eu',
      })
      expect(config?.rewrite).toContainEqual({
        from: 'api-iam.au.intercom.io',
        to: '/_scripts/c/intercom-api-au',
      })
      expect(config?.privacy.ip).toBe(true)
    })

    it('returns proxy config for crisp', () => {
      const config = getAllProxyConfigs('/_scripts/c').crisp
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'client.crisp.chat',
        to: '/_scripts/c/crisp',
      })
      expect(config?.privacy.ip).toBe(true)
    })

    it('returns proxy config for vercelAnalytics', () => {
      const config = getAllProxyConfigs('/_scripts/c').vercelAnalytics
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'va.vercel-scripts.com',
        to: '/_scripts/c/vercel',
      })
      expect(config?.routes?.['/_scripts/c/vercel/**']).toEqual({
        proxy: 'https://va.vercel-scripts.com/**',
      })
    })

    it('returns undefined for unsupported scripts', () => {
      const config = (getAllProxyConfigs('/_scripts/c') as Record<string, any>).unknownScript
      expect(config).toBeUndefined()
    })

    it('uses custom collectPrefix', () => {
      const config = getAllProxyConfigs('/_custom/proxy').googleAnalytics
      expect(config?.rewrite).toContainEqual({
        from: 'www.google.com/g/collect',
        to: '/_custom/proxy/ga/g/collect',
      })
      expect(config?.rewrite).toContainEqual({
        from: 'www.google-analytics.com',
        to: '/_custom/proxy/ga',
      })
      expect(config?.routes).toHaveProperty('/_custom/proxy/ga/**')
    })
  })

  describe('getAllProxyConfigs', () => {
    it('returns all proxy configs', () => {
      const configs = getAllProxyConfigs('/_scripts/c')
      expect(configs).toHaveProperty('googleAnalytics')
      expect(configs).toHaveProperty('googleTagManager')
      expect(configs).toHaveProperty('metaPixel')
      expect(configs).toHaveProperty('tiktokPixel')
      expect(configs).toHaveProperty('segment')
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
      expect(configs).toHaveProperty('fathomAnalytics')
      expect(configs).toHaveProperty('intercom')
      expect(configs).toHaveProperty('crisp')
      expect(configs).toHaveProperty('vercelAnalytics')
      expect(configs).toHaveProperty('gravatar')
    })

    it('all configs have valid structure', () => {
      const configs = getAllProxyConfigs('/_scripts/c')
      const fullAnonymize = ['metaPixel', 'tiktokPixel', 'xPixel', 'snapchatPixel', 'redditPixel']
      const passthrough = ['segment', 'googleTagManager', 'posthog', 'plausibleAnalytics', 'cloudflareWebAnalytics', 'rybbitAnalytics', 'umamiAnalytics', 'databuddyAnalytics', 'fathomAnalytics', 'vercelAnalytics']
      for (const [key, config] of Object.entries(configs)) {
        expect(config, `${key} should have routes`).toHaveProperty('routes')
        expect(typeof config.routes, `${key}.routes should be an object`).toBe('object')
        if (config.rewrite) {
          expect(Array.isArray(config.rewrite), `${key}.rewrite should be an array`).toBe(true)
        }
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
        if (passthrough.includes(key)) {
          for (const flag of Object.values(config.privacy)) {
            expect(flag, `${key} privacy flags should be false`).toBe(false)
          }
        }
      }
    })
  })

  describe('route rules structure', () => {
    it('googleAnalytics routes proxy to correct target', () => {
      const config = getAllProxyConfigs('/_scripts/c').googleAnalytics
      expect(config?.routes?.['/_scripts/c/ga/**']).toEqual({
        proxy: 'https://www.google-analytics.com/**',
      })
    })

    it('googleTagManager routes proxy to correct target', () => {
      const config = getAllProxyConfigs('/_scripts/c').googleTagManager
      expect(config?.routes?.['/_scripts/c/gtm/**']).toEqual({
        proxy: 'https://www.googletagmanager.com/**',
      })
    })

    it('metaPixel routes proxy to correct target', () => {
      const config = getAllProxyConfigs('/_scripts/c').metaPixel
      expect(config?.routes?.['/_scripts/c/meta/**']).toEqual({
        proxy: 'https://connect.facebook.net/**',
      })
    })

    it('plausibleAnalytics routes proxy to correct target', () => {
      const config = getAllProxyConfigs('/_scripts/c').plausibleAnalytics
      expect(config?.routes?.['/_scripts/c/plausible/**']).toEqual({
        proxy: 'https://plausible.io/**',
      })
    })

    it('cloudflareWebAnalytics routes proxy to correct targets', () => {
      const config = getAllProxyConfigs('/_scripts/c').cloudflareWebAnalytics
      expect(config?.routes?.['/_scripts/c/cfwa/**']).toEqual({
        proxy: 'https://static.cloudflareinsights.com/**',
      })
      expect(config?.routes?.['/_scripts/c/cfwa-beacon/**']).toEqual({
        proxy: 'https://cloudflareinsights.com/**',
      })
    })

    it('databuddyAnalytics routes proxy to correct targets', () => {
      const config = getAllProxyConfigs('/_scripts/c').databuddyAnalytics
      expect(config?.routes?.['/_scripts/c/databuddy/**']).toEqual({
        proxy: 'https://cdn.databuddy.cc/**',
      })
      expect(config?.routes?.['/_scripts/c/databuddy-api/**']).toEqual({
        proxy: 'https://basket.databuddy.cc/**',
      })
    })

    it('intercom routes proxy to correct targets', () => {
      const config = getAllProxyConfigs('/_scripts/c').intercom
      expect(config?.routes?.['/_scripts/c/intercom/**']).toEqual({
        proxy: 'https://widget.intercom.io/**',
      })
      expect(config?.routes?.['/_scripts/c/intercom-api/**']).toEqual({
        proxy: 'https://api-iam.intercom.io/**',
      })
      expect(config?.routes?.['/_scripts/c/intercom-api-eu/**']).toEqual({
        proxy: 'https://api-iam.eu.intercom.io/**',
      })
      expect(config?.routes?.['/_scripts/c/intercom-api-au/**']).toEqual({
        proxy: 'https://api-iam.au.intercom.io/**',
      })
    })
  })

  describe('getInterceptRules', () => {
    it('extracts rules from all proxy configs', () => {
      const rules = getInterceptRules('/_proxy')
      expect(rules.length).toBeGreaterThan(0)
      for (const rule of rules) {
        expect(rule).toHaveProperty('pattern')
        expect(rule).toHaveProperty('pathPrefix')
        expect(rule).toHaveProperty('target')
        expect(typeof rule.pattern).toBe('string')
        expect(typeof rule.pathPrefix).toBe('string')
        expect(typeof rule.target).toBe('string')
      }
    })

    it('includes GA rule with empty pathPrefix', () => {
      const rules = getInterceptRules('/_proxy')
      const gaRule = rules.find(r => r.pattern === 'www.google-analytics.com')
      expect(gaRule).toBeDefined()
      expect(gaRule?.pathPrefix).toBe('')
      expect(gaRule?.target).toBe('/_proxy/ga')
    })

    it('includes Meta tracking rule with /tr pathPrefix', () => {
      const rules = getInterceptRules('/_proxy')
      const metaTrRule = rules.find(r => r.pattern === 'www.facebook.com')
      expect(metaTrRule).toBeDefined()
      expect(metaTrRule?.pathPrefix).toBe('/tr')
      expect(metaTrRule?.target).toBe('/_proxy/meta-tr')
    })

    it('includes Meta script rule with empty pathPrefix', () => {
      const rules = getInterceptRules('/_proxy')
      const metaRule = rules.find(r => r.pattern === 'connect.facebook.net')
      expect(metaRule).toBeDefined()
      expect(metaRule?.pathPrefix).toBe('')
      expect(metaRule?.target).toBe('/_proxy/meta')
    })

    it('uses custom collectPrefix', () => {
      const rules = getInterceptRules('/_custom')
      const gaRule = rules.find(r => r.pattern === 'www.google-analytics.com')
      expect(gaRule?.target).toBe('/_custom/ga')
    })
  })

  // Test the rewriteUrl logic that runs in the __nuxtScripts client plugin.
  // This mirrors the runtime function embedded in the plugin template (module.ts).
  describe('runtime rewriteUrl', () => {
    const ORIGIN = 'https://example.com'

    function rewriteUrl(url: string, rules: ReturnType<typeof getInterceptRules>) {
      try {
        const parsed = new URL(url, ORIGIN)
        for (const rule of rules) {
          if (parsed.hostname === rule.pattern || parsed.hostname.endsWith(`.${rule.pattern}`)) {
            if (rule.pathPrefix && !parsed.pathname.startsWith(rule.pathPrefix))
              continue
            const path = rule.pathPrefix ? parsed.pathname.slice(rule.pathPrefix.length) : parsed.pathname
            return ORIGIN + rule.target + (path.startsWith('/') ? '' : '/') + path + parsed.search
          }
        }
      }
      catch { /* invalid URL */ }
      return url
    }

    const rules = getInterceptRules('/_proxy')

    it('rewrites GA collect URL', () => {
      const result = rewriteUrl('https://www.google-analytics.com/g/collect?v=2&tid=G-XXX', rules)
      expect(result).toBe(`${ORIGIN}/_proxy/ga/g/collect?v=2&tid=G-XXX`)
    })

    it('rewrites Meta tracking pixel URL', () => {
      const result = rewriteUrl('https://www.facebook.com/tr?id=123&ev=PageView', rules)
      // /tr pathPrefix stripped → empty path → / inserted before query
      expect(result).toBe(`${ORIGIN}/_proxy/meta-tr/?id=123&ev=PageView`)
    })

    it('rewrites GTM script URL', () => {
      const result = rewriteUrl('https://www.googletagmanager.com/gtm.js?id=GTM-XXX', rules)
      expect(result).toBe(`${ORIGIN}/_proxy/gtm/gtm.js?id=GTM-XXX`)
    })

    it('rewrites TikTok pixel URL', () => {
      const result = rewriteUrl('https://analytics.tiktok.com/api/v2/pixel/act', rules)
      expect(result).toBe(`${ORIGIN}/_proxy/tiktok/api/v2/pixel/act`)
    })

    it('does not rewrite unmatched URLs', () => {
      const url = 'https://cdn.example.com/script.js'
      expect(rewriteUrl(url, rules)).toBe(url)
    })

    it('passes through non-URL strings', () => {
      const val = 'not-a-url'
      expect(rewriteUrl(val, rules)).toBe(val)
    })

    it('rewrites relative URLs matching first-party paths', () => {
      // Relative URLs get resolved against ORIGIN, so they won't match cross-origin rules
      const result = rewriteUrl('/local/path', rules)
      expect(result).toBe('/local/path')
    })

    it('does not match subdomains against exact hostname rules', () => {
      // Intercept rules use exact hostnames from routes, not suffix patterns
      // region1.google-analytics.com won't match www.google-analytics.com
      const result = rewriteUrl('https://region1.google-analytics.com/g/collect', rules)
      expect(result).toBe('https://region1.google-analytics.com/g/collect')
    })

    it('skips pathPrefix mismatch', () => {
      // www.facebook.com/tr matches, but www.facebook.com/other should not match the /tr rule
      const result = rewriteUrl('https://www.facebook.com/other/path', rules)
      // Should not be rewritten because the /tr pathPrefix doesn't match /other
      expect(result).toBe('https://www.facebook.com/other/path')
    })

    it('handles fetch with Request object (passthrough)', () => {
      // The plugin's fetch wrapper passes through non-string urls
      // This tests the concept — non-string input is returned as-is
      const nonStringUrl = {} as any
      // Simulating: typeof url === 'string' ? rewriteUrl(url) : url
      const result = typeof nonStringUrl === 'string' ? rewriteUrl(nonStringUrl, rules) : nonStringUrl
      expect(result).toBe(nonStringUrl)
    })
  })
})
