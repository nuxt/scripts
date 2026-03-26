import type { NuxtConfigScriptRegistry } from '../../packages/script/src/runtime/types'
import { describe, expect, it } from 'vitest'
import { applyAutoInject } from '../../packages/script/src/module'

describe('applyAutoInject', () => {
  const posthogAutoInject = {
    configField: 'apiHost',
    computeValue: (proxyPrefix: string, config: Record<string, any>) => {
      const region = config.region || 'us'
      const host = region === 'eu' ? 'eu.i.posthog.com' : 'us.i.posthog.com'
      return `${proxyPrefix}/${host}`
    },
  }

  function makeRegistry(key: string, entry: any): NuxtConfigScriptRegistry {
    return { [key]: entry } as any
  }

  function makeRuntimeConfig(key?: string, value?: any) {
    const config: Record<string, any> = { public: { scripts: {} } }
    if (key && value !== undefined)
      config.public.scripts[key] = value
    return config
  }

  it('sets configField on the input object', () => {
    const registry = makeRegistry('posthog', [{ apiKey: 'pk_123' }])
    const runtimeConfig = makeRuntimeConfig()
    applyAutoInject(registry, runtimeConfig, '/_proxy', 'posthog', posthogAutoInject)
    const entry = (registry as any).posthog
    expect(entry[0].apiHost).toBe('/_proxy/us.i.posthog.com')
  })

  it('uses EU region from config', () => {
    const registry = makeRegistry('posthog', [{ apiKey: 'pk_123', region: 'eu' }])
    const runtimeConfig = makeRuntimeConfig()
    applyAutoInject(registry, runtimeConfig, '/_proxy', 'posthog', posthogAutoInject)
    expect((registry as any).posthog[0].apiHost).toBe('/_proxy/eu.i.posthog.com')
  })

  it('skips when entry does not exist', () => {
    const registry = makeRegistry('other', [{}])
    const runtimeConfig = makeRuntimeConfig()
    applyAutoInject(registry, runtimeConfig, '/_proxy', 'posthog', posthogAutoInject)
    expect((registry as any).posthog).toBeUndefined()
  })

  it('skips when configField already has a value', () => {
    const registry = makeRegistry('posthog', [{ apiKey: 'pk_123', apiHost: 'https://custom.host' }])
    const runtimeConfig = makeRuntimeConfig()
    applyAutoInject(registry, runtimeConfig, '/_proxy', 'posthog', posthogAutoInject)
    expect((registry as any).posthog[0].apiHost).toBe('https://custom.host')
  })

  it('skips when input has proxy: false', () => {
    const registry = makeRegistry('posthog', [{ apiKey: 'pk_123', proxy: false }])
    const runtimeConfig = makeRuntimeConfig()
    applyAutoInject(registry, runtimeConfig, '/_proxy', 'posthog', posthogAutoInject)
    expect((registry as any).posthog[0].apiHost).toBeUndefined()
  })

  it('skips when scriptOptions has proxy: false', () => {
    const registry = makeRegistry('posthog', [{ apiKey: 'pk_123' }, { proxy: false }])
    const runtimeConfig = makeRuntimeConfig()
    applyAutoInject(registry, runtimeConfig, '/_proxy', 'posthog', posthogAutoInject)
    expect((registry as any).posthog[0].apiHost).toBeUndefined()
  })

  it('propagates to runtimeConfig when it is a separate object', () => {
    const rtEntry = { apiKey: 'pk_123' }
    const registry = makeRegistry('posthog', [{ apiKey: 'pk_123' }])
    const runtimeConfig = makeRuntimeConfig('posthog', rtEntry)
    applyAutoInject(registry, runtimeConfig, '/_proxy', 'posthog', posthogAutoInject)
    expect(rtEntry.apiHost).toBe('/_proxy/us.i.posthog.com')
  })

  it('reads region from runtimeConfig entry (env var resolved values)', () => {
    const rtEntry = { apiKey: 'pk_123', region: 'eu' }
    const registry = makeRegistry('posthog', [{ apiKey: 'pk_123' }])
    const runtimeConfig = makeRuntimeConfig('posthog', rtEntry)
    applyAutoInject(registry, runtimeConfig, '/_proxy', 'posthog', posthogAutoInject)
    expect((registry as any).posthog[0].apiHost).toBe('/_proxy/eu.i.posthog.com')
  })

  it('uses custom proxyPrefix', () => {
    const registry = makeRegistry('posthog', [{ apiKey: 'pk_123' }])
    const runtimeConfig = makeRuntimeConfig()
    applyAutoInject(registry, runtimeConfig, '/_analytics', 'posthog', posthogAutoInject)
    expect((registry as any).posthog[0].apiHost).toBe('/_analytics/us.i.posthog.com')
  })
})
