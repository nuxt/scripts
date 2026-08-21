import { describe, expect, it } from 'vitest'
import { isStaticProxyTarget, STATIC_PROXY_PRESETS } from '../../packages/script/src/module'

describe('isStaticProxyTarget', () => {
  it('is false for a regular server build', () => {
    expect(isStaticProxyTarget({ generate: false, nitroStatic: false, preset: 'cloudflare_pages' })).toBe(false)
    expect(isStaticProxyTarget({})).toBe(false)
  })

  it('detects nuxi generate via _generate and nitro.static', () => {
    expect(isStaticProxyTarget({ generate: true })).toBe(true)
    expect(isStaticProxyTarget({ generate: true, preset: 'cloudflare' })).toBe(true)
    expect(isStaticProxyTarget({ nitroStatic: true })).toBe(true)
  })

  it('detects static presets from NITRO_PRESET / SERVER_PRESET', () => {
    for (const preset of STATIC_PROXY_PRESETS) {
      expect(isStaticProxyTarget({ preset })).toBe(true)
    }
    expect(isStaticProxyTarget({ preset: '' })).toBe(false)
    expect(isStaticProxyTarget({ preset: 'vercel' })).toBe(false)
  })
})
