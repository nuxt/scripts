import type { Server } from 'node:http'
import { createServer, request as httpRequest } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for #791: proxy handler must strip hop-by-hop request headers per RFC 7230 §6.1.
 *
 * Hop-by-hop headers are connection-specific and must not be forwarded by a proxy:
 *   connection, keep-alive, proxy-authenticate, proxy-authorization,
 *   te, trailer, transfer-encoding, upgrade
 *
 * Additionally, any header named in the `Connection` header value must also be stripped.
 */

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({
    'nuxt-scripts-proxy': {
      proxyPrefix: '/_scripts/p',
      domainPrivacy: {
        'upstream.test': false,
      },
      privacy: false,
      debug: false,
    },
  }),
  useNitroApp: () => ({
    hooks: { callHook: async () => {} },
  }),
}))

vi.mock('../../packages/script/src/runtime/server/utils/network-host', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../packages/script/src/runtime/server/utils/network-host')>()
  return {
    ...actual,
    createPublicNetworkDispatcher: async () => ({
      fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
      close: async () => {},
    }),
  }
})

describe('proxy handler - hop-by-hop request headers (#791)', () => {
  let proxyServer: Server
  let proxyPort: number
  let SKIP_REQUEST_HEADERS: Set<string>

  // Intercept the fetch call inside the handler so we can inspect the headers
  // that would actually be forwarded upstream (before the Node http client
  // re-adds its own connection/host headers).
  let lastForwardedHeaders: Record<string, string> = {}
  let upstreamServer: Server
  let upstreamPort: number
  let realFetch: typeof globalThis.fetch

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
      const url = new URL(reqUrl)
      if (url.hostname === 'upstream.test') {
        // Capture the headers the proxy intended to forward
        const hdrs = (init?.headers ?? {}) as Record<string, string>
        lastForwardedHeaders = { ...hdrs }
        const redirected = `http://127.0.0.1:${upstreamPort}${url.pathname}${url.search}`
        return realFetch(redirected, { ...init, headers: {} })
      }
      return realFetch(input, init)
    }

    const mod = await import('../../packages/script/src/runtime/server/proxy-handler')
    SKIP_REQUEST_HEADERS = mod.SKIP_REQUEST_HEADERS

    const app = createApp()
    app.use(mod.default)
    proxyServer = createServer(toNodeListener(app))
    await new Promise<void>(resolve => proxyServer.listen(0, resolve))
    proxyPort = (proxyServer.address() as any).port
  })

  beforeEach(() => {
    lastForwardedHeaders = {}
  })

  afterAll(() => {
    if (realFetch)
      globalThis.fetch = realFetch
    upstreamServer?.close()
    proxyServer?.close()
  })

  it('exports SKIP_REQUEST_HEADERS containing all RFC 7230 §6.1 hop-by-hop headers', () => {
    expect(SKIP_REQUEST_HEADERS).toBeInstanceOf(Set)
    for (const h of [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
    ]) {
      expect(SKIP_REQUEST_HEADERS.has(h)).toBe(true)
    }
  })

  // Use raw http.request because undici (global fetch) rejects forbidden hop-by-hop request headers.
  function rawGet(headers: Record<string, string>) {
    return new Promise<void>((resolve, reject) => {
      const req = httpRequest({
        host: '127.0.0.1',
        port: proxyPort,
        path: '/_scripts/p/upstream.test/collect',
        method: 'GET',
        headers,
      }, (res) => {
        res.resume()
        res.on('end', () => resolve())
      })
      req.on('error', reject)
      req.end()
    })
  }

  it('strips hop-by-hop request headers before forwarding upstream', async () => {
    await rawGet({
      'connection': 'keep-alive, X-Custom-Hop',
      'keep-alive': 'timeout=5',
      'proxy-authorization': 'Bearer secret',
      'te': 'trailers',
      'x-custom-hop': 'should-not-forward',
      'accept': 'application/json',
      'user-agent': 'test-agent',
    })

    for (const h of ['connection', 'keep-alive', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']) {
      expect(lastForwardedHeaders[h], `hop-by-hop "${h}" should not be forwarded`).toBeUndefined()
    }
    // Header named in Connection header is stripped too
    expect(lastForwardedHeaders['x-custom-hop']).toBeUndefined()
    // Non-hop-by-hop headers pass through
    expect(lastForwardedHeaders.accept).toBe('application/json')
    expect(lastForwardedHeaders['user-agent']).toBe('test-agent')
  })
})
