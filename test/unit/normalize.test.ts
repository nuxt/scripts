import { describe, expect, it } from 'vitest'
import { normalizeRegistryConfig } from '../../packages/script/src/normalize'

describe('normalizeRegistryConfig', () => {
  it('rejects the removed true shorthand', () => {
    const registry: Record<string, any> = { plausible: true }
    expect(() => normalizeRegistryConfig(registry)).toThrowError(/registry\.plausible.*invalid/i)
  })

  it('rejects removed string shorthands', () => {
    const registry: Record<string, any> = { ga: 'proxy-only' }
    expect(() => normalizeRegistryConfig(registry)).toThrowError(/registry\.ga.*invalid/i)
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

  it('rejects removed tuple entries', () => {
    const entry = [{ domain: 'mysite.com' }, { proxy: false }]
    const registry: Record<string, any> = { plausible: entry }
    expect(() => normalizeRegistryConfig(registry)).toThrowError(/registry\.plausible.*invalid/i)
  })

  it('deletes falsy entries', () => {
    const registry: Record<string, any> = { plausible: false, ga: null, gtm: undefined }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toBeUndefined()
    expect(registry.ga).toBeUndefined()
    expect(registry.gtm).toBeUndefined()
  })

  it('rejects invalid primitive entries', () => {
    const registry: Record<string, any> = { plausible: 42 }
    expect(() => normalizeRegistryConfig(registry)).toThrowError(/registry\.plausible.*invalid/i)
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
