import type { ConsentState } from '../../packages/script/src/runtime/types'
import { describe, expect, it, vi } from 'vitest'
import { validateConsentState } from '../../packages/script/src/runtime/registry/_gcm-consent'

function collectWarnings(state: unknown): string[] {
  const warn = vi.fn()
  validateConsentState({ warn } as any, state as ConsentState, 'consent.update()')
  return warn.mock.calls.map(([message]) => message as string)
}

describe('validateConsentState', () => {
  it('accepts a valid partial GCMv2 state', () => {
    expect(collectWarnings({
      ad_storage: 'granted',
      analytics_storage: 'denied',
      wait_for_update: 500,
      region: ['AU', 'NZ'],
    })).toEqual([])
  })

  it('warns once per unknown key', () => {
    const warnings = collectWarnings({ analytics_storages: 'granted', ad_storag: 'denied' })
    expect(warnings).toHaveLength(2)
    expect(warnings[0]).toContain('analytics_storages')
    expect(warnings[1]).toContain('ad_storag')
  })

  it('warns on a consent value outside granted/denied', () => {
    const warnings = collectWarnings({ ad_storage: 'allow' })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('ad_storage')
    expect(warnings[0]).toContain('"allow"')
  })

  it('warns when wait_for_update is not a number', () => {
    expect(collectWarnings({ wait_for_update: '500' })[0]).toContain('wait_for_update')
    expect(collectWarnings({ wait_for_update: Number.NaN })[0]).toContain('wait_for_update')
  })

  it('warns when region is not an array of strings', () => {
    expect(collectWarnings({ region: 'AU' })[0]).toContain('region')
    expect(collectWarnings({ region: ['AU', 2] })[0]).toContain('region')
  })

  it('warns when the state is not an object', () => {
    expect(collectWarnings(null)[0]).toContain('must be an object')
    expect(collectWarnings('granted')[0]).toContain('must be an object')
  })

  it('reports the calling source in each warning', () => {
    expect(collectWarnings({ nope: 'granted' })[0]).toContain('consent.update()')
  })
})
