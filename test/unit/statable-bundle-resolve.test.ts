import { describe, expect, it } from 'vitest'
import { getBundleResolve, registry } from '../../packages/script/src/registry'
import { StatableAnalyticsOptions } from '../../packages/script/src/runtime/registry/schemas'

async function getStatableResolve() {
  const all = await registry()
  const script = all.find(s => s.registryKey === 'statableAnalytics')!
  const resolve = getBundleResolve(script)
  if (!resolve)
    throw new Error('statableAnalytics bundle.resolve missing')
  return resolve
}

describe('statableAnalytics bundle.resolve', () => {
  it('returns false for a missing siteId instead of throwing', async () => {
    const resolve = await getStatableResolve()
    expect(resolve(undefined)).toBe(false)
    expect(resolve({})).toBe(false)
  })

  it('builds the src from the siteId', async () => {
    const resolve = await getStatableResolve()
    expect(resolve({ siteId: '3270462' })).toBe('https://statable.com/js/3270462/s.js')
  })
})

describe('statableAnalytics dev validation', () => {
  function validate(options: Record<string, unknown>) {
    return (StatableAnalyticsOptions as any)['~standard'].validate(options) as { issues?: unknown[] }
  }

  it('rejects an empty siteId', () => {
    const result = validate({ siteId: '' })
    expect(result.issues?.length).toBeGreaterThan(0)
  })

  it('accepts a non-empty siteId', () => {
    const result = validate({ siteId: '3270462' })
    expect(result.issues).toBeUndefined()
  })
})
