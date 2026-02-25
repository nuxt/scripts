import { describe, expect, it } from 'vitest'
import { getAllProxyConfigs, getProxyConfig, getSWInterceptRules, rewriteScriptUrls } from '../../src/proxy-configs'

describe('proxy configs', () => {
  describe('rewriteScriptUrls', () => {
    it('rewrites https URLs with double quotes', () => {
      const input = `fetch("https://www.google-analytics.com/g/collect")`
      const output = rewriteScriptUrls(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`fetch("/_scripts/c/ga/g/collect")`)
    })

    it('rewrites https URLs with single quotes', () => {
      const input = `url='https://www.google-analytics.com/analytics.js'`
      const output = rewriteScriptUrls(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`url='/_scripts/c/ga/analytics.js'`)
    })

    it('rewrites https URLs with backticks', () => {
      const input = 'const u=`https://www.google-analytics.com/collect`'
      const output = rewriteScriptUrls(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe('const u=`/_scripts/c/ga/collect`')
    })

    it('rewrites protocol-relative URLs', () => {
      const input = `"//www.google-analytics.com/analytics.js"`
      const output = rewriteScriptUrls(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`"/_scripts/c/ga/analytics.js"`)
    })

    it('rewrites http URLs', () => {
      const input = `"http://www.google-analytics.com/analytics.js"`
      const output = rewriteScriptUrls(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(`"/_scripts/c/ga/analytics.js"`)
    })

    it('handles multiple rewrites in single content', () => {
      const input = `
        fetch("https://www.google-analytics.com/g/collect");
        fetch("https://analytics.google.com/collect");
      `
      const output = rewriteScriptUrls(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
        { from: 'analytics.google.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toContain(`"/_scripts/c/ga/g/collect"`)
      expect(output).toContain(`"/_scripts/c/ga/collect"`)
    })

    it('handles GTM URLs', () => {
      const input = `src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"`
      const output = rewriteScriptUrls(input, [
        { from: 'www.googletagmanager.com', to: '/_scripts/c/gtm' },
      ])
      expect(output).toBe(`src="/_scripts/c/gtm/gtm.js?id=GTM-XXXX"`)
    })

    it('handles Meta Pixel URLs', () => {
      const input = `"https://connect.facebook.net/en_US/fbevents.js"`
      const output = rewriteScriptUrls(input, [
        { from: 'connect.facebook.net', to: '/_scripts/c/meta' },
      ])
      expect(output).toBe(`"/_scripts/c/meta/en_US/fbevents.js"`)
    })

    it('does not rewrite bare domain strings without fromPath', () => {
      // GA4 constructs URLs dynamically: "https://" + prefix + "analytics.google.com/" + "g/collect"
      // The bare "analytics.google.com/" fragment should NOT be rewritten
      const input = `"https://"+e+"analytics.google.com/"+"g/collect"`
      const output = rewriteScriptUrls(input, [
        { from: 'analytics.google.com', to: '/_scripts/c/ga' },
      ])
      // The bare string "analytics.google.com/" must survive — it's a concatenation component
      expect(output).toContain(`"analytics.google.com/"`)
    })

    it('does not rewrite bare suffix-matched domain strings without fromPath', () => {
      // Suffix match (.google-analytics.com) on bare string without path should not rewrite
      const input = `"https://"+e+".google-analytics.com/"+"g/collect"`
      const output = rewriteScriptUrls(input, [
        { from: '.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toContain(`".google-analytics.com/"`)
    })

    it('returns unmodified content when no matches', () => {
      const input = `fetch("https://example.com/api")`
      const output = rewriteScriptUrls(input, [
        { from: 'www.google-analytics.com', to: '/_scripts/c/ga' },
      ])
      expect(output).toBe(input)
    })
  })

  describe('getProxyConfig', () => {
    it('returns proxy config for googleAnalytics', () => {
      const config = getProxyConfig('googleAnalytics', '/_scripts/c')
      expect(config).toBeDefined()
      expect(config?.rewrite).toBeDefined()
      expect(config?.routes).toBeDefined()
      // Modern GA4 endpoint
      expect(config?.rewrite).toContainEqual({
        from: 'www.google.com/g/collect',
        to: '/_scripts/c/ga/g/collect',
      })
      // Legacy endpoint (also goes to /ga, unified route)
      expect(config?.rewrite).toContainEqual({
        from: 'www.google-analytics.com',
        to: '/_scripts/c/ga',
      })
    })

    it('returns proxy config for googleTagManager', () => {
      const config = getProxyConfig('googleTagManager', '/_scripts/c')
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'www.googletagmanager.com',
        to: '/_scripts/c/gtm',
      })
    })

    it('returns proxy config for metaPixel', () => {
      const config = getProxyConfig('metaPixel', '/_scripts/c')
      expect(config).toBeDefined()
      expect(config?.rewrite).toContainEqual({
        from: 'connect.facebook.net',
        to: '/_scripts/c/meta',
      })
    })

    it('returns undefined for unsupported scripts', () => {
      const config = getProxyConfig('unknownScript', '/_scripts/c')
      expect(config).toBeUndefined()
    })

    it('uses custom collectPrefix', () => {
      const config = getProxyConfig('googleAnalytics', '/_custom/proxy')
      // Modern GA4 endpoint with custom prefix
      expect(config?.rewrite).toContainEqual({
        from: 'www.google.com/g/collect',
        to: '/_custom/proxy/ga/g/collect',
      })
      // Legacy endpoint also rewrites to /ga (unified route)
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
    })

    it('all configs have valid structure', () => {
      const configs = getAllProxyConfigs('/_scripts/c')
      for (const [key, config] of Object.entries(configs)) {
        expect(config, `${key} should have routes`).toHaveProperty('routes')
        expect(typeof config.routes, `${key}.routes should be an object`).toBe('object')
        if (config.rewrite) {
          expect(Array.isArray(config.rewrite), `${key}.rewrite should be an array`).toBe(true)
        }
      }
    })
  })

  describe('route rules structure', () => {
    it('googleAnalytics routes proxy to correct target', () => {
      const config = getProxyConfig('googleAnalytics', '/_scripts/c')
      // GA collect endpoint - routes to google-analytics.com which accepts both
      // modern (www.google.com/g/collect) and legacy formats
      expect(config?.routes?.['/_scripts/c/ga/**']).toEqual({
        proxy: 'https://www.google-analytics.com/**',
      })
    })

    it('googleTagManager routes proxy to correct target', () => {
      const config = getProxyConfig('googleTagManager', '/_scripts/c')
      expect(config?.routes?.['/_scripts/c/gtm/**']).toEqual({
        proxy: 'https://www.googletagmanager.com/**',
      })
    })

    it('metaPixel routes proxy to correct target', () => {
      const config = getProxyConfig('metaPixel', '/_scripts/c')
      expect(config?.routes?.['/_scripts/c/meta/**']).toEqual({
        proxy: 'https://connect.facebook.net/**',
      })
    })
  })

  describe('getSWInterceptRules', () => {
    it('extracts rules from all proxy configs', () => {
      const rules = getSWInterceptRules('/_proxy')
      expect(rules.length).toBeGreaterThan(0)
      // All rules should have pattern, pathPrefix, and target
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
      const rules = getSWInterceptRules('/_proxy')
      const gaRule = rules.find(r => r.pattern === 'www.google-analytics.com')
      expect(gaRule).toBeDefined()
      expect(gaRule?.pathPrefix).toBe('')
      expect(gaRule?.target).toBe('/_proxy/ga')
    })

    it('includes Meta tracking rule with /tr pathPrefix', () => {
      const rules = getSWInterceptRules('/_proxy')
      // Meta-tr route: https://www.facebook.com/tr/**
      const metaTrRule = rules.find(r => r.pattern === 'www.facebook.com')
      expect(metaTrRule).toBeDefined()
      expect(metaTrRule?.pathPrefix).toBe('/tr')
      expect(metaTrRule?.target).toBe('/_proxy/meta-tr')
    })

    it('includes Meta script rule with empty pathPrefix', () => {
      const rules = getSWInterceptRules('/_proxy')
      const metaRule = rules.find(r => r.pattern === 'connect.facebook.net')
      expect(metaRule).toBeDefined()
      expect(metaRule?.pathPrefix).toBe('')
      expect(metaRule?.target).toBe('/_proxy/meta')
    })

    it('uses custom collectPrefix', () => {
      const rules = getSWInterceptRules('/_custom')
      const gaRule = rules.find(r => r.pattern === 'www.google-analytics.com')
      expect(gaRule?.target).toBe('/_custom/ga')
    })
  })
})
