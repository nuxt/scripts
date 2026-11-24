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

vi.mock('#nuxt-scripts/nitro', () => ({
  useRuntimeConfig: () => ({
    'nuxt-scripts-proxy': {
      proxyPrefix: '/_scripts/p',
      domainPrivacy: {
        'upstream.test': false,
        'plausible.test': false,
        'private-plausible.test': true,
      },
      plausibleDomains: ['plausible.test', 'private-plausible.test'],
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

  // Intercept the fetch call inside the handler so we can inspect the headers
  // that would actually be forwarded upstream (before the Node http client
  // re-adds its own connection/host headers).
  let lastForwardedHeaders: Record<string, string> = {}
  let upstreamServer: Server
  let upstreamPort: number
  let realFetch: typeof globalThis.fetch
  let cloudflare: 'nitro' | 'srvx' | false = false

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
      if (['upstream.test', 'plausible.test', 'private-plausible.test'].includes(url.hostname)) {
        // Capture the headers the proxy intended to forward
        const hdrs = (init?.headers ?? {}) as Record<string, string>
        lastForwardedHeaders = { ...hdrs }
        if (url.pathname === '/redirect')
          return new Response(null, { status: 307, headers: { location: 'https://upstream.test/collect' } })
        const redirected = `http://127.0.0.1:${upstreamPort}${url.pathname}${url.search}`
        return realFetch(redirected, { ...init, headers: {} })
      }
      return realFetch(input, init)
    }

    const mod = await import('../../packages/script/src/runtime/server/proxy-handler')

    const app = createApp()
    app.use((event) => {
      if (cloudflare === 'nitro')
        Object.assign(event.context, { _platform: { cloudflare: {} } })
      if (cloudflare === 'srvx')
        Object.defineProperty(event.req, 'runtime', { value: { name: 'cloudflare' } })
    })
    app.use(mod.default)
    proxyServer = createServer(toNodeListener(app))
    await new Promise<void>(resolve => proxyServer.listen(0, resolve))
    proxyPort = (proxyServer.address() as any).port
  })

  beforeEach(() => {
    lastForwardedHeaders = {}
    cloudflare = false
  })

  afterAll(() => {
    if (realFetch)
      globalThis.fetch = realFetch
    upstreamServer?.close()
    proxyServer?.close()
  })

  // Use raw http.request because undici (global fetch) rejects forbidden hop-by-hop request headers.
  function proxyRequest(headers: Record<string, string>, method = 'GET', upstream = 'upstream.test/collect') {
    return new Promise<void>((resolve, reject) => {
      const req = httpRequest({
        host: '127.0.0.1',
        port: proxyPort,
        path: `/_scripts/p/${upstream}`,
        method,
        headers,
      }, (res) => {
        res.resume()
        res.on('end', () => resolve())
      })
      req.on('error', reject)
      req.end()
    })
  }

  it('forwards only supported request headers', async () => {
    await proxyRequest({
      'x-vercel-oidc-token': 'test-token',
      'x-platform-internal': 'platform metadata',
      'authorization': 'Bearer app-credential',
      'cookie': 'session=local',
      'accept': 'application/json',
      'origin': 'https://website.test',
      'sec-fetch-mode': 'cors',
    })

    expect(lastForwardedHeaders['x-vercel-oidc-token']).toBeUndefined()
    expect(lastForwardedHeaders['x-platform-internal']).toBeUndefined()
    expect(lastForwardedHeaders.authorization).toBeUndefined()
    expect(lastForwardedHeaders.cookie).toBeUndefined()
    expect(lastForwardedHeaders.accept).toBe('application/json')
    expect(lastForwardedHeaders.origin).toBe('https://website.test')
    expect(lastForwardedHeaders['sec-fetch-mode']).toBe('cors')
  })

  it.each([
    { method: 'GET', range: 'bytes=0-20', preflight: undefined },
    { method: 'HEAD', range: 'bytes=0-20', preflight: undefined },
    { method: 'POST', range: undefined, preflight: undefined },
    { method: 'OPTIONS', range: undefined, preflight: 'POST' },
  ])('forwards headers for the $method request', async ({ method, range, preflight }) => {
    await proxyRequest({
      'access-control-request-method': 'POST',
      'content-language': 'en',
      'content-location': 'https://website.test/event',
      'cache-control': 'no-cache',
      'if-none-match': '"version"',
      'range': 'bytes=0-20',
    }, method)

    expect(lastForwardedHeaders.range).toBe(range)
    expect(lastForwardedHeaders['if-none-match']).toBe(range ? '"version"' : undefined)
    expect(lastForwardedHeaders['access-control-request-method']).toBe(preflight)
    expect(lastForwardedHeaders['content-length']).toBeUndefined()
    expect(lastForwardedHeaders['content-language']).toBeUndefined()
    expect(lastForwardedHeaders['content-location']).toBeUndefined()
    expect(lastForwardedHeaders['cache-control']).toBe('no-cache')
  })

  it('forwards one visitor address instead of copying IP headers', async () => {
    await proxyRequest({
      'forwarded': 'for=198.51.100.23;host=website.test',
      'x-forwarded-for': '198.51.100.23, 198.51.100.24',
      'x-real-ip': '198.51.100.23',
      'cf-connecting-ip': '198.51.100.23',
      'true-client-ip': '198.51.100.23',
    })

    expect(lastForwardedHeaders['x-forwarded-for']).toBe('198.51.100.23')
    expect(lastForwardedHeaders.forwarded).toBeUndefined()
    expect(lastForwardedHeaders['x-real-ip']).toBeUndefined()
    expect(lastForwardedHeaders['cf-connecting-ip']).toBeUndefined()
    expect(lastForwardedHeaders['true-client-ip']).toBeUndefined()
  })

  it.each([
    { upstream: 'plausible.test/collect', cloudflareRequest: 'nitro', expected: '198.51.100.23' },
    { upstream: 'plausible.test/collect', cloudflareRequest: 'srvx', expected: '198.51.100.23' },
    { upstream: 'private-plausible.test/collect', cloudflareRequest: 'nitro', expected: '198.51.100.0' },
    { upstream: 'plausible.test/collect', cloudflareRequest: false, expected: undefined },
    { upstream: 'upstream.test/collect', cloudflareRequest: 'nitro', expected: undefined },
    { upstream: 'plausible.test/redirect', cloudflareRequest: 'nitro', expected: undefined },
  ] as const)('scopes the Cloudflare visitor address for $upstream (Cloudflare $cloudflareRequest)', async ({ upstream, cloudflareRequest, expected }) => {
    cloudflare = cloudflareRequest
    await proxyRequest({ 'cf-connecting-ip': '198.51.100.23' }, 'POST', upstream)

    expect(lastForwardedHeaders['cf-connecting-ip']).toBe(expected)
  })

  it('strips hop-by-hop request headers before forwarding upstream', async () => {
    await proxyRequest({
      'connection': 'keep-alive, Accept-Language, X-Forwarded-For',
      'keep-alive': 'timeout=5',
      'proxy-authorization': 'Bearer secret',
      'te': 'trailers',
      'accept-language': 'en-US',
      'x-forwarded-for': '198.51.100.17',
      'accept': 'application/json',
      'user-agent': 'test-agent',
    })

    for (const h of ['connection', 'keep-alive', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']) {
      expect(lastForwardedHeaders[h], `hop-by-hop "${h}" should not be forwarded`).toBeUndefined()
    }
    // Header named in Connection header is stripped too
    expect(lastForwardedHeaders['accept-language']).toBeUndefined()
    expect(lastForwardedHeaders['x-forwarded-for']).not.toBe('198.51.100.17')
    // Non-hop-by-hop headers pass through
    expect(lastForwardedHeaders.accept).toBe('application/json')
    expect(lastForwardedHeaders['user-agent']).toBe('test-agent')
  })
})
