import { describe, expect, it } from 'vitest'
import { normalizeRegistryConfig } from '../../src/normalize'

describe('normalizeRegistryConfig', () => {
  it('normalizes true to [{}]', () => {
    const registry: Record<string, any> = { plausible: true }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toEqual([{}])
  })

  it('normalizes "mock" to [{}, { trigger: "manual", skipValidation: true }]', () => {
    const registry: Record<string, any> = { plausible: 'mock' }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toEqual([{}, { trigger: 'manual', skipValidation: true }])
  })

  it('wraps plain object in array', () => {
    const registry: Record<string, any> = { plausible: { domain: 'mysite.com' } }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toEqual([{ domain: 'mysite.com' }])
  })

  it('leaves valid tuple unchanged', () => {
    const entry = [{ domain: 'mysite.com' }, { reverseProxyIntercept: false }]
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
      plausible: true,
      ga: { id: 'G-XXX' },
      posthog: 'mock',
      stripe: false,
    }
    normalizeRegistryConfig(registry)
    expect(registry.plausible).toEqual([{}])
    expect(registry.ga).toEqual([{ id: 'G-XXX' }])
    expect(registry.posthog).toEqual([{}, { trigger: 'manual', skipValidation: true }])
    expect(registry.stripe).toBeUndefined()
  })
})
