import { describe, expect, it } from 'vitest'
import { isStaticProxyTarget, normalizeNitroPreset, STATIC_PROXY_PRESETS } from '../../packages/script/src/module'

describe('isStaticProxyTarget', () => {
  it('is false for a regular server build', () => {
    expect(isStaticProxyTarget({ generate: false, nitroStatic: false, preset: 'cloudflare_pages' })).toBe(false)
    expect(isStaticProxyTarget({})).toBe(false)
    expect(isStaticProxyTarget({ preset: 'vercel' })).toBe(false)
    expect(isStaticProxyTarget({ preset: 'netlify' })).toBe(false)
  })

  it('detects nuxi generate via _generate and nitro.static', () => {
    expect(isStaticProxyTarget({ generate: true })).toBe(true)
    expect(isStaticProxyTarget({ generate: true, preset: 'cloudflare' })).toBe(true)
    expect(isStaticProxyTarget({ nitroStatic: true })).toBe(true)
  })

  it('detects every static preset in its hyphen, underscore, and camelCase form', () => {
    expect(isStaticProxyTarget({ preset: 'static' })).toBe(true)
    expect(isStaticProxyTarget({ preset: 'github_pages' })).toBe(true)
    expect(isStaticProxyTarget({ preset: 'githubPages' })).toBe(true)
    expect(isStaticProxyTarget({ preset: 'gitlab_pages' })).toBe(true)
    expect(isStaticProxyTarget({ preset: 'cloudflare_pages_static' })).toBe(true)
    expect(isStaticProxyTarget({ preset: 'cloudflarePagesStatic' })).toBe(true)
    expect(isStaticProxyTarget({ preset: 'netlify_static' })).toBe(true)
    expect(isStaticProxyTarget({ preset: 'vercel_static' })).toBe(true)
    expect(isStaticProxyTarget({ preset: 'zeabur_static' })).toBe(true)
    expect(isStaticProxyTarget({ preset: 'zerops_static' })).toBe(true)
  })

  it('keeps the preset list free of non-static or unknown presets', () => {
    // azure-static and firebase-static are not Nitro presets; gitlab-pages is.
    expect(STATIC_PROXY_PRESETS).not.toContain('azure-static')
    expect(STATIC_PROXY_PRESETS).not.toContain('firebase-static')
    expect(STATIC_PROXY_PRESETS).toContain('gitlab-pages')
  })
})

describe('normalizeNitroPreset', () => {
  it('maps underscore and camelCase spellings onto the hyphen form', () => {
    expect(normalizeNitroPreset('github_pages')).toBe('github-pages')
    expect(normalizeNitroPreset('githubPages')).toBe('github-pages')
    expect(normalizeNitroPreset('github-pages')).toBe('github-pages')
    expect(normalizeNitroPreset('static')).toBe('static')
  })
})
