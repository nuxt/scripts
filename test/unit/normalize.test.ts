import { describe, expect, it, vi } from 'vitest'
import { migrateDeprecatedRegistryKeys, normalizeRegistryConfig } from '../../packages/script/src/normalize'

describe('normalizeRegistryConfig', () => {
  it('normalizes true to [{}, { trigger: "onNuxtReady" }]', () => {
    const registry: Record<string, any> = { plausible: true }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toEqual([{}, { trigger: 'onNuxtReady' }])
  })

  it('warns when true shorthand is used', () => {
    const warn = vi.fn()
    const registry: Record<string, any> = { plausible: true }
    normalizeRegistryConfig(registry, warn)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('true')
    expect(warn.mock.calls[0][0]).toContain('deprecated')
  })

  it('throws on "proxy-only" with migration message', () => {
    const registry: Record<string, any> = { ga: 'proxy-only' }
    expect(() => normalizeRegistryConfig(registry)).toThrowError(/proxy-only.*no longer supported/)
  })

  it('normalizes "mock" to [{}, { trigger: "manual", skipValidation: true }]', () => {
    const registry: Record<string, any> = { plausible: 'mock' }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toEqual([{}, { trigger: 'manual', skipValidation: true }])
  })

  it('wraps empty object in array', () => {
    const registry: Record<string, any> = { plausible: {} }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toEqual([{}])
  })

  it('wraps plain object without hoisted keys in array', () => {
    const registry: Record<string, any> = { plausible: { domain: 'mysite.com' } }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toEqual([{ domain: 'mysite.com' }])
  })

  it('hoists trigger to scriptOptions', () => {
    const registry: Record<string, any> = { ga: { id: 'G-xxx', trigger: 'onNuxtReady' } }
    normalizeRegistryConfig(registry)
    expect(registry.ga).toEqual([{ id: 'G-xxx' }, { trigger: 'onNuxtReady' }])
  })

  it('hoists trigger: false to scriptOptions', () => {
    const registry: Record<string, any> = { ga: { id: 'G-xxx', trigger: false } }
    normalizeRegistryConfig(registry)
    expect(registry.ga).toEqual([{ id: 'G-xxx' }, { trigger: false }])
  })

  it('hoists proxy to scriptOptions', () => {
    const registry: Record<string, any> = { plausible: { domain: 'mysite.com', proxy: false } }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toEqual([{ domain: 'mysite.com' }, { proxy: false }])
  })

  it('hoists bundle and partytown to scriptOptions', () => {
    const registry: Record<string, any> = { ga: { id: 'G-xxx', bundle: false, partytown: true } }
    normalizeRegistryConfig(registry)
    expect(registry.ga).toEqual([{ id: 'G-xxx' }, { bundle: false, partytown: true }])
  })

  it('merges hoisted keys with scriptOptions', () => {
    const registry: Record<string, any> = { ga: { id: 'G-xxx', trigger: 'onNuxtReady', scriptOptions: { warmupStrategy: 'preconnect' } } }
    normalizeRegistryConfig(registry)
    expect(registry.ga).toEqual([{ id: 'G-xxx' }, { trigger: 'onNuxtReady', warmupStrategy: 'preconnect' }])
  })

  it('top-level flags take precedence over scriptOptions', () => {
    const registry: Record<string, any> = { ga: { id: 'G-xxx', proxy: true, scriptOptions: { proxy: false } } }
    normalizeRegistryConfig(registry)
    expect(registry.ga).toEqual([{ id: 'G-xxx' }, { proxy: true }])
  })

  it('leaves valid tuple unchanged', () => {
    const entry = [{ domain: 'mysite.com' }, { proxy: false }]
    const registry: Record<string, any> = { plausible: entry }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toBe(entry)
  })

  it('fills missing input in tuple with empty object', () => {
    const registry: Record<string, any> = { plausible: [null, { trigger: 'manual' }] }
    normalizeRegistryConfig(registry)
    expect(registry.plausible[0]).toEqual({})
    expect(registry.plausible[1]).toEqual({ trigger: 'manual' })
  })

  it('deletes falsy entries', () => {
    const registry: Record<string, any> = { plausible: false, ga: null, gtm: undefined, stripe: 0 }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toBeUndefined()
    expect(registry.ga).toBeUndefined()
    expect(registry.gtm).toBeUndefined()
    expect(registry.stripe).toBeUndefined()
  })

  it('deletes empty array [null, null]', () => {
    const registry: Record<string, any> = { plausible: [null, null] }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toBeUndefined()
  })

  it('deletes non-object/non-boolean/non-string entries', () => {
    const registry: Record<string, any> = { plausible: 42 }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toBeUndefined()
  })

  it('handles multiple entries in one pass', () => {
    const registry: Record<string, any> = {
      ga: { id: 'G-XXX' },
      posthog: 'mock',
      stripe: false,
    }
    normalizeRegistryConfig(registry)
    expect(registry.ga).toEqual([{ id: 'G-XXX' }])
    expect(registry.posthog).toEqual([{}, { trigger: 'manual', skipValidation: true }])
    expect(registry.stripe).toBeUndefined()
  })
})

describe('migrateDeprecatedRegistryKeys', () => {
  it('rewrites reverseProxyIntercept in flat object to proxy', () => {
    const warn = vi.fn()
    const registry: Record<string, any> = { ga: { id: 'G-xxx', reverseProxyIntercept: false } }
    migrateDeprecatedRegistryKeys(registry, warn)
    expect(registry.ga).toEqual({ id: 'G-xxx', proxy: false })
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toContain('reverseProxyIntercept')
  })

  it('rewrites reverseProxyIntercept in nested scriptOptions', () => {
    const warn = vi.fn()
    const registry: Record<string, any> = { ga: { id: 'G-xxx', scriptOptions: { reverseProxyIntercept: false } } }
    migrateDeprecatedRegistryKeys(registry, warn)
    expect(registry.ga.scriptOptions).toEqual({ proxy: false })
    expect(warn).toHaveBeenCalledOnce()
  })

  it('rewrites reverseProxyIntercept in array tuple scriptOptions', () => {
    const warn = vi.fn()
    const registry: Record<string, any> = { ga: [{ id: 'G-xxx' }, { reverseProxyIntercept: false }] }
    migrateDeprecatedRegistryKeys(registry, warn)
    expect(registry.ga[1]).toEqual({ proxy: false })
    expect(warn).toHaveBeenCalledOnce()
  })

  it('does not clobber existing proxy when both are present', () => {
    const warn = vi.fn()
    const registry: Record<string, any> = { ga: { id: 'G-xxx', proxy: true, reverseProxyIntercept: false } }
    migrateDeprecatedRegistryKeys(registry, warn)
    expect(registry.ga).toEqual({ id: 'G-xxx', proxy: true })
    expect(warn).toHaveBeenCalledOnce()
  })

  it('does not warn when reverseProxyIntercept is absent', () => {
    const warn = vi.fn()
    const registry: Record<string, any> = { ga: { id: 'G-xxx', proxy: false } }
    migrateDeprecatedRegistryKeys(registry, warn)
    expect(registry.ga).toEqual({ id: 'G-xxx', proxy: false })
    expect(warn).not.toHaveBeenCalled()
  })

  it('skips non-object entries', () => {
    const warn = vi.fn()
    const registry: Record<string, any> = { ga: true, posthog: 'mock', stripe: false }
    migrateDeprecatedRegistryKeys(registry, warn)
    expect(warn).not.toHaveBeenCalled()
  })
})
