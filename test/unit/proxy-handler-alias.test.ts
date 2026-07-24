import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { stubNitroRuntime } from './__mocks__/stub-nitro-runtime'

/**
 * Issue #814: proxy paths may use opaque/custom aliases instead of the verbatim
 * third-party hostname. The handler must resolve `alias → real domain` before
 * validating the allowlist and forwarding upstream.
 */

stubNitroRuntime({
  useRuntimeConfig: () => ({
    'nuxt-scripts-proxy': {
      proxyPrefix: '/_scripts/p',
      domainPrivacy: {
        'analytics.internal.example.com': false,
      },
      aliasToDomain: {
        a1b2c3d4: 'analytics.internal.example.com',
      },
      privacy: false,
      debug: false,
    },
  }),
  useNitroApp: () => ({
    hooks: { callHook: async () => {} },
  }),
})

describe('proxy handler - path aliases (#814)', () => {
  let proxyServer: Server
  let proxyPort: number
  let upstreamServer: Server
  let upstreamPort: number
  let realFetch: typeof globalThis.fetch
  let lastTargetUrl = ''

  beforeAll(async () => {
    upstreamServer = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{}')
    })
    await new Promise<void>(resolve => upstreamServer.listen(0, resolve))
    upstreamPort = (upstreamServer.address() as any).port

    realFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const reqUrl = typeof input === 'string' ? input : input.url
      lastTargetUrl = reqUrl
      const url = new URL(reqUrl)
      if (url.hostname === 'analytics.internal.example.com') {
        const redirected = `http://127.0.0.1:${upstreamPort}${url.pathname}${url.search}`
        return realFetch(redirected, { ...init, headers: {} })
      }
      return realFetch(input, init)
    }

    const mod = await import('../../packages/script/src/runtime/server/proxy-handler')
    const app = createApp()
    app.use(mod.default)
    proxyServer = createServer(toNodeListener(app))
    await new Promise<void>(resolve => proxyServer.listen(0, resolve))
    proxyPort = (proxyServer.address() as any).port
  })

  beforeEach(() => {
    lastTargetUrl = ''
  })

  afterAll(() => {
    if (realFetch)
      globalThis.fetch = realFetch
    upstreamServer?.close()
    proxyServer?.close()
  })

  async function get(path: string) {
    return realFetch(`http://127.0.0.1:${proxyPort}${path}`)
  }

  it('resolves an alias segment back to the real upstream domain', async () => {
    const res = await get('/_scripts/p/a1b2c3d4/api/send?x=1')
    expect(res.status).toBe(200)
    expect(lastTargetUrl).toBe('https://analytics.internal.example.com/api/send?x=1')
  })

  it('still accepts verbatim-hostname paths (alias is opt-in per request)', async () => {
    const res = await get('/_scripts/p/analytics.internal.example.com/api/send')
    expect(res.status).toBe(200)
    expect(lastTargetUrl).toBe('https://analytics.internal.example.com/api/send')
  })

  it('rejects an unknown alias segment that is not in the allowlist', async () => {
    const res = await get('/_scripts/p/deadbeef/api/send')
    expect(res.status).toBe(403)
  })

  it('rejects a crafted segment matching a prototype member (no 500)', async () => {
    // `aliasToDomain['toString']` would be Object.prototype.toString without the
    // own-property guard, breaking allowlist matching and 500-ing.
    const res = await get('/_scripts/p/toString/api/send')
    expect(res.status).toBe(403)
  })
})
