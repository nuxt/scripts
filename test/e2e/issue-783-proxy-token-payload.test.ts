import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// https://github.com/nuxt/scripts/issues/783
// With `security.pageToken: false`, the per-request proxy token must not be
// generated, so the SSR payload (and any response `etag` derived from it)
// stays identical across requests.
await setup({
  rootDir: resolve('../fixtures/issue-783'),
  dev: true,
  browser: false,
})

describe('issue-783 proxy token payload', () => {
  it('does not issue a page token when security.pageToken is false', async () => {
    const html = await $fetch<string>('/proxy')
    // useScriptProxyToken resolves to null, so the page renders the fallback.
    expect(html).toContain('token: none')
  })

  it('keeps the SSR payload identical across requests', async () => {
    const [a, b] = await Promise.all([
      $fetch<string>('/proxy'),
      $fetch<string>('/proxy'),
    ])
    expect(a).toBe(b)
  })

  it('keeps token-free pages identical across requests', async () => {
    const [a, b] = await Promise.all([
      $fetch<string>('/'),
      $fetch<string>('/'),
    ])
    expect(a).toBe(b)
  })
})
