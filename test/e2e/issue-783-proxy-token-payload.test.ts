import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// https://github.com/nuxt/scripts/issues/783
// Proxy URL signing and the per-request page token were removed. Static Maps
// now uses the public, application-restricted key directly, so the SSR payload
// is identical across requests (which a response `etag` can rely on).
await setup({
  rootDir: resolve('../fixtures/issue-783'),
  dev: true,
  browser: false,
})

describe('issue-783 proxy token payload', () => {
  it('renders a direct Google URL with no proxy credential', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('https://maps.googleapis.com/maps/api/staticmap')
    expect(html).toContain('key=test-key')
    expect(html).not.toContain('/_scripts/proxy/google-static-maps')
    expect(html).not.toContain('_pt=')
    expect(html).not.toContain('_ts=')
    expect(html).not.toMatch(/[?&]sig=/)
  })

  it('keeps the SSR payload identical across requests', async () => {
    const [a, b] = await Promise.all([
      $fetch<string>('/'),
      $fetch<string>('/'),
    ])
    expect(a).toBe(b)
  })
})
