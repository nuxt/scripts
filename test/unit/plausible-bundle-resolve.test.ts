import { describe, expect, it } from 'vitest'
import { getBundleResolve, registry } from '../../packages/script/src/registry'

async function getPlausibleResolve() {
  const all = await registry()
  const script = all.find(s => s.registryKey === 'plausibleAnalytics')!
  const resolve = getBundleResolve(script)
  if (!resolve)
    throw new Error('plausibleAnalytics bundle.resolve missing')
  return resolve
}

describe('plausibleAnalytics bundle.resolve', () => {
  it('returns default plausible.io URL with scriptId', async () => {
    const resolve = await getPlausibleResolve()
    expect(resolve({ scriptId: 'abc123' } as any)).toBe('https://plausible.io/js/pa-abc123.js')
  })

  it('returns default plausible.io URL with legacy extension', async () => {
    const resolve = await getPlausibleResolve()
    expect(resolve({ extension: 'hash' } as any)).toBe('https://plausible.io/js/script.hash.js')
  })

  it('returns default basic plausible.io URL with no options', async () => {
    const resolve = await getPlausibleResolve()
    expect(resolve(undefined)).toBe('https://plausible.io/js/script.js')
  })

  it('honors user-supplied scriptInput.src for self-hosted Plausible', async () => {
    // Regression test for https://github.com/nuxt/scripts/issues/768
    const resolve = await getPlausibleResolve()
    const selfHosted = 'https://my-self-hosted-plausible.io/js/script.js'
    expect(
      resolve({ scriptId: 'abc123', scriptInput: { src: selfHosted } } as any),
    ).toBe(selfHosted)
    expect(
      resolve({ scriptInput: { src: selfHosted } } as any),
    ).toBe(selfHosted)
  })
})
