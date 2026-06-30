import { createResolver } from '@nuxt/kit'
import { $fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// End-to-end coverage for proxy path aliases (#814). Builds a real app with
// `scripts.proxy.alias` set and verifies the full module wiring: the alias reaches
// both the auto-injected endpoint config and the runtime proxy handler.
await setup({
  rootDir: resolve('../fixtures/proxy-alias'),
  build: true,
})

describe('proxy path aliases', () => {
  it('auto-injects the aliased endpoint instead of the real hostname', async () => {
    // app.vue renders the resolved Plausible endpoint from public runtime config.
    const html = await $fetch('/')
    expect(html).toContain('/_scripts/p/pl/api/event')
    // the real hostname must never appear in the proxy path
    expect(html).not.toContain('/_scripts/p/plausible.io')
  })

  it('rejects an unknown alias segment (reverse map is consulted)', async () => {
    const res = await fetch(url('/_scripts/p/not-a-real-alias/api/event'))
    expect(res.status).toBe(403)
  })

  it('resolves the alias back to the real domain instead of 403ing', async () => {
    // `pl` resolves to plausible.io and is proxied upstream. Whatever the upstream
    // returns (or a 502 if unreachable), it must not be our allowlist 403.
    const res = await fetch(url('/_scripts/p/pl/api/event'), {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'application/json' },
    }).catch(() => null)
    // A null here means a transport-level error reaching our own server, which is a
    // genuine test failure; a resolved alias always yields an HTTP response.
    expect(res).not.toBeNull()
    expect(res!.status).not.toBe(403)
  }, 30000)
})
