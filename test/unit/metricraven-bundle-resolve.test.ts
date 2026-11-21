import { describe, expect, it } from 'vitest'
import { getBundleResolve, registry } from '../../packages/script/src/registry'
import { MetricRavenAnalyticsOptions } from '../../packages/script/src/runtime/registry/schemas'

async function getMetricRavenResolve() {
  const all = await registry()
  const script = all.find(s => s.registryKey === 'metricravenAnalytics')!
  const resolve = getBundleResolve(script)
  if (!resolve)
    throw new Error('metricravenAnalytics bundle.resolve missing')
  return resolve
}

describe('metricravenAnalytics bundle.resolve', () => {
  it('returns false for a missing siteId instead of throwing', async () => {
    const resolve = await getMetricRavenResolve()
    expect(resolve(undefined)).toBe(false)
    expect(resolve({})).toBe(false)
  })

  it('bundles the hosted tracker', async () => {
    const resolve = await getMetricRavenResolve()
    expect(resolve({ siteId: 'ana_pub_x' })).toBe('https://metricraven.com/js/script.js')
  })

  it('bundles from apiHost', async () => {
    const resolve = await getMetricRavenResolve()
    expect(resolve({ siteId: 'ana_pub_x', apiHost: 'https://a.example.com/' })).toBe('https://a.example.com/js/script.js')
  })

  it('bundles an absolute scriptUrl and skips a relative one', async () => {
    const resolve = await getMetricRavenResolve()
    expect(resolve({ siteId: 'ana_pub_x', scriptUrl: 'https://cdn.example.com/mr.js' })).toBe('https://cdn.example.com/mr.js')
    expect(resolve({ siteId: 'ana_pub_x', scriptUrl: '/a/script' })).toBe(false)
  })
})

describe('metricravenAnalytics dev validation', () => {
  function validate(options: Record<string, unknown>) {
    return (MetricRavenAnalyticsOptions as any)['~standard'].validate(options) as { issues?: unknown[] }
  }

  it('accepts a public site id', () => {
    expect(validate({ siteId: 'ana_pub_AbC123-xyz_9' }).issues).toBeUndefined()
  })

  it.each(['', 'ana_pub_', 'abc', 'ana_sk_123', ' ana_pub_123 '])('rejects an invalid siteId: %s', (siteId) => {
    expect(validate({ siteId }).issues?.length).toBeGreaterThan(0)
  })

  it('rejects an unknown autocapture kind', () => {
    expect(validate({ siteId: 'ana_pub_x', autocapture: ['clicks', 'hovers'] }).issues?.length).toBeGreaterThan(0)
    expect(validate({ siteId: 'ana_pub_x', autocapture: ['clicks', 'forms'] }).issues).toBeUndefined()
  })
})
