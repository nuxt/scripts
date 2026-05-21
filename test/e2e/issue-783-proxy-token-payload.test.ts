import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// https://github.com/nuxt/scripts/issues/783
// Proxy URL signing and the per-request page token were removed. Proxy URLs
// carry no per-request artefacts, so the SSR payload is identical across
// requests (which a response `etag` can rely on).
await setup({
  rootDir: resolve('../fixtures/issue-783'),
  dev: true,
  browser: false,
})

describe('issue-783 proxy token payload', () => {
  it('renders a plain proxy URL with no signature or page token', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('/_scripts/proxy/google-static-maps')
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
