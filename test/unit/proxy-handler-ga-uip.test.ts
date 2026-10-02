import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Issue #939: GA4 geolocates collection hits by the connecting IP and ignores
 * X-Forwarded-For, so the proxy forwards the first X-Forwarded-For entry as `_uip`.
 */

vi.mock('#nuxt-scripts/nitro', () => ({
  useRuntimeConfig: () => ({
    'nuxt-scripts-proxy': {
      proxyPrefix: '/_scripts/p',
      domainPrivacy: {
        'www.google-analytics.com': true,
        'region1.google-analytics.com': false,
        'analytics.google.com': true,
        'www.google.com': true,
        'stats.g.doubleclick.net': true,
        'www.facebook.com': true,
      },
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

describe('proxy handler - GA4 client IP (#939)', () => {
  let proxyServer: Server
  let proxyPort: number
  let upstreamServer: Server
  let upstreamPort: number
  let realFetch: typeof globalThis.fetch
  let lastTargetUrl = ''

  beforeAll(async () => {
    upstreamServer = createServer((_req, res) => {
      res.writeHead(204)
      res.end()
    })
    await new Promise<void>(resolve => upstreamServer.listen(0, resolve))
    upstreamPort = (upstreamServer.address() as any).port

    realFetch = globalThis.fetch
    globalThis.fetch = async (input: any, init?: any) => {
      const reqUrl = typeof input === 'string' ? input : input.url
      lastTargetUrl = reqUrl
      const url = new URL(reqUrl)
      return realFetch(`http://127.0.0.1:${upstreamPort}${url.pathname}${url.search}`, { ...init, headers: {} })
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

  async function post(path: string, xForwardedFor = '203.0.113.7') {
    const res = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/${path}`, {
      method: 'POST',
      headers: { 'x-forwarded-for': xForwardedFor },
    })
    expect(res.status).toBe(204)
    return lastTargetUrl
  }

  it('adds the anonymized client IP to www.google-analytics.com /g/collect', async () => {
    expect(await post('www.google-analytics.com/g/collect?v=2&tid=G-TEST'))
      .toBe('https://www.google-analytics.com/g/collect?v=2&tid=G-TEST&_uip=203.0.113.0')
    expect(await post('www.google-analytics.com/g/collect?v=2&tid=G-TEST', '2001:db8:abcd:12::1'))
      .toBe('https://www.google-analytics.com/g/collect?v=2&tid=G-TEST&_uip=2001%3Adb8%3Aabcd%3A%3A')
  })

  it('uses the first X-Forwarded-For entry for region1.analytics.google.com', async () => {
    expect(await post('region1.analytics.google.com/g/collect?v=2', '198.51.100.23, 10.0.0.1'))
      .toBe('https://region1.analytics.google.com/g/collect?v=2&_uip=198.51.100.0')
  })

  it('adds the client IP to the www.google.com copy of /g/collect', async () => {
    expect(await post('www.google.com/g/collect?v=2&gaf=1'))
      .toBe('https://www.google.com/g/collect?v=2&gaf=1&_uip=203.0.113.0')
  })

  it('adds the client IP to /g/s/collect', async () => {
    expect(await post('www.google-analytics.com/g/s/collect?v=2'))
      .toBe('https://www.google-analytics.com/g/s/collect?v=2&_uip=203.0.113.0')
  })

  it('uses the raw client IP when IP privacy is off', async () => {
    expect(await post('region1.google-analytics.com/g/collect?v=2'))
      .toBe('https://region1.google-analytics.com/g/collect?v=2&_uip=203.0.113.7')
  })

  it('replaces a client-supplied _uip with the anonymized client IP when IP privacy is on', async () => {
    expect(await post('www.google-analytics.com/g/collect?v=2&_uip=192.0.2.55&tid=G-TEST'))
      .toBe('https://www.google-analytics.com/g/collect?v=2&tid=G-TEST&_uip=203.0.113.0')
  })

  it('keeps a client-supplied _uip when IP privacy is off', async () => {
    expect(await post('region1.google-analytics.com/g/collect?v=2&_uip=192.0.2.55'))
      .toBe('https://region1.google-analytics.com/g/collect?v=2&_uip=192.0.2.55')
  })

  it('leaves non-GA4 endpoints unchanged', async () => {
    expect(await post('www.google.com/pagead/1p-conversion/123/?v=2'))
      .toBe('https://www.google.com/pagead/1p-conversion/123/?v=2')
    expect(await post('stats.g.doubleclick.net/g/collect?v=2'))
      .toBe('https://stats.g.doubleclick.net/g/collect?v=2')
    expect(await post('www.facebook.com/tr?id=1&ev=PageView'))
      .toBe('https://www.facebook.com/tr?id=1&ev=PageView')
  })
})
