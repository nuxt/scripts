import { describe, expect, it } from 'vitest'
import { applyAutoInject } from '../../packages/script/src/module'
import { normalizeRegistryConfig } from '../../packages/script/src/normalize'
import { buildProxyConfigsFromRegistry, registry } from '../../packages/script/src/registry'

let _proxyConfigs: ReturnType<typeof buildProxyConfigsFromRegistry> | undefined
async function getProxyConfigs() {
  if (!_proxyConfigs)
    _proxyConfigs = buildProxyConfigsFromRegistry(await registry())
  return _proxyConfigs
}

function makeRuntimeConfig(scripts: Record<string, any> = {}) {
  return { public: { scripts } }
}

/**
 * Apply auto-inject for all proxy configs that have autoInject defined,
 * mimicking what finalizeFirstParty does (normalize → inject).
 */
async function autoInjectAll(registry: any, rt: any, proxyPrefix: string) {
  normalizeRegistryConfig(registry)
  const configs = await getProxyConfigs()
  for (const [key, config] of Object.entries(configs)) {
    if (config.autoInject && registry[key] !== undefined) {
      applyAutoInject(registry, rt, proxyPrefix, key, config.autoInject)
    }
  }
}

describe('autoInject via proxy configs', () => {
  describe('object entries', () => {
    it('injects apiHost for posthog config object', async () => {
      const registry: any = { posthog: { apiKey: 'phc_test' } }
      const rt = makeRuntimeConfig({ posthog: { apiKey: 'phc_test' } })

      await autoInjectAll(registry, rt, '/_proxy')

      // After normalization, object entries become [input]
      expect(registry.posthog[0].apiHost).toBe('/_proxy/us.i.posthog.com')
      expect(rt.public.scripts.posthog.apiHost).toBe('/_proxy/us.i.posthog.com')
    })

    it('injects endpoint for plausible config object', async () => {
      const registry: any = { plausibleAnalytics: { domain: 'example.com' } }
      const rt = makeRuntimeConfig({ plausibleAnalytics: { domain: 'example.com' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(registry.plausibleAnalytics[0].endpoint).toBe('/_proxy/plausible.io/api/event')
      expect(rt.public.scripts.plausibleAnalytics.endpoint).toBe('/_proxy/plausible.io/api/event')
    })

    it('does not override existing config field', async () => {
      const registry: any = { posthog: { apiKey: 'phc_test', apiHost: 'https://custom.host' } }
      const rt = makeRuntimeConfig({ posthog: { apiKey: 'phc_test', apiHost: 'https://custom.host' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(registry.posthog[0].apiHost).toBe('https://custom.host')
      expect(rt.public.scripts.posthog.apiHost).toBe('https://custom.host')
    })

    it('uses EU prefix when posthog region is eu', async () => {
      const registry: any = { posthog: { apiKey: 'phc_test', region: 'eu' } }
      const rt = makeRuntimeConfig({ posthog: { apiKey: 'phc_test', region: 'eu' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(registry.posthog[0].apiHost).toBe('/_proxy/eu.i.posthog.com')
    })
  })

  describe('array entries', () => {
    it('injects into first element of array entry', async () => {
      const registry: any = { posthog: [{ apiKey: 'phc_test' }, { partytown: true }] }
      const rt = makeRuntimeConfig({ posthog: { apiKey: 'phc_test' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(registry.posthog[0].apiHost).toBe('/_proxy/us.i.posthog.com')
      expect(rt.public.scripts.posthog.apiHost).toBe('/_proxy/us.i.posthog.com')
    })

    it('skips empty array entries', async () => {
      const registry: any = { posthog: [] }
      const rt = makeRuntimeConfig({ posthog: { apiKey: '' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(rt.public.scripts.posthog.apiHost).toBeUndefined()
    })
  })

  describe('empty object entries (env var driven)', () => {
    it('injects into runtimeConfig for posthog: {}', async () => {
      const registry: any = { posthog: {} }
      const rt = makeRuntimeConfig({ posthog: { apiKey: '' } })

      await autoInjectAll(registry, rt, '/_proxy')

      // After normalization, {} becomes [{}] — both input and runtimeConfig get the value
      expect(registry.posthog[0].apiHost).toBe('/_proxy/us.i.posthog.com')
      expect(rt.public.scripts.posthog.apiHost).toBe('/_proxy/us.i.posthog.com')
    })

    it('uses EU prefix for posthog: {} when runtime region is eu', async () => {
      const registry: any = { posthog: {} }
      const rt = makeRuntimeConfig({ posthog: { apiKey: '', region: 'eu' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(rt.public.scripts.posthog.apiHost).toBe('/_proxy/eu.i.posthog.com')
    })

    it('injects into runtimeConfig for plausibleAnalytics: {}', async () => {
      const registry: any = { plausibleAnalytics: {} }
      const rt = makeRuntimeConfig({ plausibleAnalytics: { domain: '' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(rt.public.scripts.plausibleAnalytics.endpoint).toBe('/_proxy/plausible.io/api/event')
    })

    it('injects into runtimeConfig for umamiAnalytics: {}', async () => {
      const registry: any = { umamiAnalytics: {} }
      const rt = makeRuntimeConfig({ umamiAnalytics: { websiteId: '' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(rt.public.scripts.umamiAnalytics.hostUrl).toBe('/_proxy/cloud.umami.is')
    })

    it('injects into runtimeConfig for rybbitAnalytics: {}', async () => {
      const registry: any = { rybbitAnalytics: {} }
      const rt = makeRuntimeConfig({ rybbitAnalytics: { siteId: '' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(rt.public.scripts.rybbitAnalytics.analyticsHost).toBe('/_proxy/app.rybbit.io/api')
    })

    it('injects into runtimeConfig for databuddyAnalytics: {}', async () => {
      const registry: any = { databuddyAnalytics: {} }
      const rt = makeRuntimeConfig({ databuddyAnalytics: { clientId: '' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(rt.public.scripts.databuddyAnalytics.apiUrl).toBe('/_proxy/basket.databuddy.cc')
    })
  })

  describe('mock entries', () => {
    it('injects into runtimeConfig for posthog: mock', async () => {
      const registry: any = { posthog: 'mock' }
      const rt = makeRuntimeConfig({ posthog: { apiKey: '' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(rt.public.scripts.posthog.apiHost).toBe('/_proxy/us.i.posthog.com')
    })
  })

  describe('skipped entries', () => {
    it('skips scripts without autoInject config', async () => {
      const registry: any = { googleAnalytics: { id: 'G-TEST' } }
      const rt = makeRuntimeConfig({ googleAnalytics: { id: 'G-TEST' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(rt.public.scripts.googleAnalytics).toEqual({ id: 'G-TEST' })
    })

    it('skips falsy entries', async () => {
      const registry: any = { posthog: false }
      const rt = makeRuntimeConfig()

      await autoInjectAll(registry, rt, '/_proxy')

      expect(rt.public.scripts.posthog).toBeUndefined()
    })

    it('does not modify existing runtimeConfig for falsy entry', async () => {
      const registry: any = { posthog: false }
      const rt = makeRuntimeConfig({ posthog: { existing: 'value' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(rt.public.scripts.posthog).toEqual({ existing: 'value' })
    })
  })

  describe('proxy opt-out', () => {
    it('skips auto-inject when input has proxy: false', async () => {
      const registry: any = { plausibleAnalytics: { domain: 'example.com', proxy: false } }
      const rt = makeRuntimeConfig({ plausibleAnalytics: { domain: 'example.com' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(registry.plausibleAnalytics[0].endpoint).toBeUndefined()
      expect(rt.public.scripts.plausibleAnalytics.endpoint).toBeUndefined()
    })

    it('skips auto-inject when scriptOptions has proxy: false', async () => {
      const registry: any = { posthog: [{ apiKey: 'phc_test' }, { proxy: false }] }
      const rt = makeRuntimeConfig({ posthog: { apiKey: 'phc_test' } })

      await autoInjectAll(registry, rt, '/_proxy')

      expect(registry.posthog[0].apiHost).toBeUndefined()
      expect(rt.public.scripts.posthog.apiHost).toBeUndefined()
    })
  })

  describe('custom proxyPrefix', () => {
    it('uses custom prefix in computed values', async () => {
      const registry: any = { posthog: {} }
      const rt = makeRuntimeConfig({ posthog: { apiKey: '' } })

      await autoInjectAll(registry, rt, '/_analytics')

      expect(rt.public.scripts.posthog.apiHost).toBe('/_analytics/us.i.posthog.com')
    })
  })
})
