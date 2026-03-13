import { describe, expect, it } from 'vitest'
import { autoInjectProxyEndpoints } from '../../src/first-party/auto-inject'

function makeRuntimeConfig(scripts: Record<string, any> = {}) {
  return { public: { scripts } }
}

describe('autoInjectProxyEndpoints', () => {
  describe('object entries', () => {
    it('injects apiHost for posthog config object', () => {
      const registry: any = { posthog: { apiKey: 'phc_test' } }
      const rt = makeRuntimeConfig({ posthog: { apiKey: 'phc_test' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(registry.posthog.apiHost).toBe('/_proxy/ph')
      expect(rt.public.scripts.posthog.apiHost).toBe('/_proxy/ph')
    })

    it('injects endpoint for plausible config object', () => {
      const registry: any = { plausibleAnalytics: { domain: 'example.com' } }
      const rt = makeRuntimeConfig({ plausibleAnalytics: { domain: 'example.com' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(registry.plausibleAnalytics.endpoint).toBe('/_proxy/plausible/api/event')
      expect(rt.public.scripts.plausibleAnalytics.endpoint).toBe('/_proxy/plausible/api/event')
    })

    it('does not override existing config field', () => {
      const registry: any = { posthog: { apiKey: 'phc_test', apiHost: 'https://custom.host' } }
      const rt = makeRuntimeConfig({ posthog: { apiKey: 'phc_test', apiHost: 'https://custom.host' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(registry.posthog.apiHost).toBe('https://custom.host')
      expect(rt.public.scripts.posthog.apiHost).toBe('https://custom.host')
    })

    it('uses EU prefix when posthog region is eu', () => {
      const registry: any = { posthog: { apiKey: 'phc_test', region: 'eu' } }
      const rt = makeRuntimeConfig({ posthog: { apiKey: 'phc_test', region: 'eu' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(registry.posthog.apiHost).toBe('/_proxy/ph-eu')
    })
  })

  describe('array entries', () => {
    it('injects into first element of array entry', () => {
      const registry: any = { posthog: [{ apiKey: 'phc_test' }, { partytown: true }] }
      const rt = makeRuntimeConfig({ posthog: { apiKey: 'phc_test' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(registry.posthog[0].apiHost).toBe('/_proxy/ph')
      expect(rt.public.scripts.posthog.apiHost).toBe('/_proxy/ph')
    })

    it('skips empty array entries', () => {
      const registry: any = { posthog: [] }
      const rt = makeRuntimeConfig({ posthog: { apiKey: '' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(rt.public.scripts.posthog.apiHost).toBeUndefined()
    })
  })

  describe('boolean entries', () => {
    it('injects into runtimeConfig for posthog: true', () => {
      const registry: any = { posthog: true }
      const rt = makeRuntimeConfig({ posthog: { apiKey: '' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(registry.posthog).toBe(true)
      expect(rt.public.scripts.posthog.apiHost).toBe('/_proxy/ph')
    })

    it('uses EU prefix for posthog: true when runtime region is eu', () => {
      const registry: any = { posthog: true }
      const rt = makeRuntimeConfig({ posthog: { apiKey: '', region: 'eu' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(rt.public.scripts.posthog.apiHost).toBe('/_proxy/ph-eu')
    })

    it('injects into runtimeConfig for plausibleAnalytics: true', () => {
      const registry: any = { plausibleAnalytics: true }
      const rt = makeRuntimeConfig({ plausibleAnalytics: { domain: '' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(rt.public.scripts.plausibleAnalytics.endpoint).toBe('/_proxy/plausible/api/event')
    })

    it('injects into runtimeConfig for umamiAnalytics: true', () => {
      const registry: any = { umamiAnalytics: true }
      const rt = makeRuntimeConfig({ umamiAnalytics: { websiteId: '' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(rt.public.scripts.umamiAnalytics.hostUrl).toBe('/_proxy/umami')
    })

    it('injects into runtimeConfig for rybbitAnalytics: true', () => {
      const registry: any = { rybbitAnalytics: true }
      const rt = makeRuntimeConfig({ rybbitAnalytics: { siteId: '' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(rt.public.scripts.rybbitAnalytics.analyticsHost).toBe('/_proxy/rybbit/api')
    })

    it('injects into runtimeConfig for databuddyAnalytics: true', () => {
      const registry: any = { databuddyAnalytics: true }
      const rt = makeRuntimeConfig({ databuddyAnalytics: { clientId: '' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(rt.public.scripts.databuddyAnalytics.apiUrl).toBe('/_proxy/databuddy-api')
    })
  })

  describe('mock entries', () => {
    it('injects into runtimeConfig for posthog: mock', () => {
      const registry: any = { posthog: 'mock' }
      const rt = makeRuntimeConfig({ posthog: { apiKey: '' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(rt.public.scripts.posthog.apiHost).toBe('/_proxy/ph')
    })
  })

  describe('skipped entries', () => {
    it('skips scripts not in AUTO_INJECT_DEFS', () => {
      const registry: any = { googleAnalytics: { id: 'G-TEST' } }
      const rt = makeRuntimeConfig({ googleAnalytics: { id: 'G-TEST' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(rt.public.scripts.googleAnalytics).toEqual({ id: 'G-TEST' })
    })

    it('skips falsy entries', () => {
      const registry: any = { posthog: false }
      const rt = makeRuntimeConfig()

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(rt.public.scripts.posthog).toBeUndefined()
    })

    it('does not modify existing runtimeConfig for falsy entry', () => {
      const registry: any = { posthog: false }
      const rt = makeRuntimeConfig({ posthog: { existing: 'value' } })

      autoInjectProxyEndpoints(registry, rt, '/_proxy')

      expect(rt.public.scripts.posthog).toEqual({ existing: 'value' })
    })
  })

  describe('custom collectPrefix', () => {
    it('uses custom prefix in computed values', () => {
      const registry: any = { posthog: true }
      const rt = makeRuntimeConfig({ posthog: { apiKey: '' } })

      autoInjectProxyEndpoints(registry, rt, '/_analytics')

      expect(rt.public.scripts.posthog.apiHost).toBe('/_analytics/ph')
    })
  })
})
