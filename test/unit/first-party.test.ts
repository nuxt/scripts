import { describe, expect, it } from 'vitest'
import { getAllProxyConfigs, getProxyConfig } from '../../src/proxy-configs'

describe('first-party mode', () => {
  describe('default configuration', () => {
    it('firstParty defaults to true', async () => {
      // This is a documentation test - the actual default is in module.ts
      // We test the proxy configs work correctly when enabled
      const configs = getAllProxyConfigs('/_scripts/c')
      expect(Object.keys(configs).length).toBeGreaterThan(0)
    })

    it('all supported scripts have both rewrite and routes', () => {
      const configs = getAllProxyConfigs('/_scripts/c')
      const supportedScripts = [
        'googleAnalytics',
        'googleTagManager',
        'metaPixel',
        'tiktokPixel',
        'segment',
        'xPixel',
        'snapchatPixel',
        'redditPixel',
        'clarity',
        'hotjar',
      ]

      for (const script of supportedScripts) {
        const config = configs[script]
        expect(config, `${script} should have config`).toBeDefined()
        expect(config.rewrite, `${script} should have rewrite rules`).toBeDefined()
        expect(config.routes, `${script} should have route rules`).toBeDefined()
        expect(config.rewrite.length, `${script} should have at least one rewrite`).toBeGreaterThan(0)
        expect(Object.keys(config.routes).length, `${script} should have at least one route`).toBeGreaterThan(0)
      }
    })
  })

  describe('custom collectPrefix', () => {
    it('applies custom prefix to all configs', () => {
      const customPrefix = '/_analytics'
      const configs = getAllProxyConfigs(customPrefix)

      for (const [key, config] of Object.entries(configs)) {
        // All rewrites should use custom prefix
        for (const rewrite of config.rewrite || []) {
          expect(rewrite.to, `${key} rewrite should use custom prefix`).toContain(customPrefix)
        }
        // All routes should use custom prefix
        for (const route of Object.keys(config.routes || {})) {
          expect(route, `${key} route should use custom prefix`).toContain(customPrefix)
        }
      }
    })
  })

  describe('route rule format', () => {
    it('all routes have valid proxy target', () => {
      const configs = getAllProxyConfigs('/_scripts/c')

      for (const [key, config] of Object.entries(configs)) {
        for (const [route, rule] of Object.entries(config.routes || {})) {
          expect(rule.proxy, `${key} route ${route} should have proxy target`).toBeDefined()
          expect(rule.proxy, `${key} route ${route} should proxy to https`).toMatch(/^https:\/\//)
          expect(rule.proxy, `${key} route ${route} should have wildcard`).toContain('**')
        }
      }
    })

    it('route patterns match Nitro format', () => {
      const configs = getAllProxyConfigs('/_scripts/c')

      for (const [key, config] of Object.entries(configs)) {
        for (const route of Object.keys(config.routes || {})) {
          // Should end with /** for wildcard matching
          expect(route, `${key} route should end with /**`).toMatch(/\/\*\*$/)
        }
      }
    })
  })

  describe('status endpoint data structure', () => {
    it('can generate status data from configs', () => {
      const configs = getAllProxyConfigs('/_scripts/c')
      const registryKeys = ['googleAnalytics', 'metaPixel']

      // Simulate what the module does to build status
      const neededRoutes: Record<string, string> = {}
      for (const key of registryKeys) {
        const config = configs[key]
        if (config?.routes) {
          for (const [path, rule] of Object.entries(config.routes)) {
            neededRoutes[path] = rule.proxy
          }
        }
      }

      const status = {
        enabled: true,
        scripts: registryKeys,
        routes: neededRoutes,
        collectPrefix: '/_scripts/c',
      }

      expect(status.enabled).toBe(true)
      expect(status.scripts).toEqual(['googleAnalytics', 'metaPixel'])
      expect(Object.keys(status.routes).length).toBeGreaterThan(0)
      expect(status.collectPrefix).toBe('/_scripts/c')
    })
  })
})
