import { describe, expect, it } from 'vitest'
import { getAllProxyConfigs, getProxyConfig, rewriteScriptUrls } from '../../src/proxy-configs'

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
      // Legacy endpoint
      expect(config?.rewrite).toContainEqual({
        from: 'www.google-analytics.com',
        to: '/_scripts/c/ga-legacy',
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
      // Legacy endpoint with custom prefix
      expect(config?.rewrite).toContainEqual({
        from: 'www.google-analytics.com',
        to: '/_custom/proxy/ga-legacy',
      })
      expect(config?.routes).toHaveProperty('/_custom/proxy/ga/**')
      expect(config?.routes).toHaveProperty('/_custom/proxy/ga-legacy/**')
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
        expect(config, `${key} should have rewrite`).toHaveProperty('rewrite')
        expect(Array.isArray(config.rewrite), `${key}.rewrite should be an array`).toBe(true)
        expect(typeof config.routes, `${key}.routes should be an object`).toBe('object')
      }
    })
  })

  describe('route rules structure', () => {
    it('googleAnalytics routes proxy to correct target', () => {
      const config = getProxyConfig('googleAnalytics', '/_scripts/c')
      // Modern GA4 endpoint
      expect(config?.routes?.['/_scripts/c/ga/**']).toEqual({
        proxy: 'https://www.google.com/**',
      })
      // Legacy endpoint
      expect(config?.routes?.['/_scripts/c/ga-legacy/**']).toEqual({
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
})
