import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PAGE_TOKEN_PARAM, PAGE_TOKEN_TS_PARAM, SIG_PARAM } from '../../packages/script/src/runtime/server/utils/sign-constants'

const { rawFetchMock } = vi.hoisted(() => ({ rawFetchMock: vi.fn() }))

vi.mock('nitropack/runtime', () => ({
  defineCachedFunction: (handler: (...args: any[]) => any) => handler,
  useRuntimeConfig: () => ({
    'nuxt-scripts': { googleStaticMapsProxy: { apiKey: 'server-key' } },
    'public': { 'nuxt-scripts': { googleStaticMapsProxy: { enabled: true, cacheMaxAge: 60 } } },
  }),
}))

vi.mock('ofetch', () => ({
  createFetch: vi.fn(() => Object.assign(vi.fn(), { raw: rawFetchMock })),
}))

const staticMapHandler = (await import('../../packages/script/src/runtime/server/google-static-maps-proxy')).default

describe('google static map proxy', () => {
  let proxyServer: Server
  let proxyPort: number

  beforeAll(async () => {
    const app = createApp()
    app.use(staticMapHandler)
    proxyServer = createServer(toNodeListener(app))
    await new Promise<void>(resolve => proxyServer.listen(0, '127.0.0.1', resolve))
    proxyPort = (proxyServer.address() as { port: number }).port
  })

  beforeEach(() => {
    rawFetchMock.mockReset()
    rawFetchMock.mockResolvedValue({
      _data: new TextEncoder().encode('image').buffer,
      headers: new Headers({ 'content-type': 'image/png' }),
      status: 200,
    })
  })

  afterAll(async () => {
    await new Promise<void>(resolve => proxyServer.close(() => resolve()))
  })

  it('strips proxy credentials and the client key from the upstream URL', async () => {
    const query = new URLSearchParams({
      center: 'Melbourne',
      key: 'client-key',
      [SIG_PARAM]: 'signature',
      [PAGE_TOKEN_PARAM]: 'page-token',
      [PAGE_TOKEN_TS_PARAM]: '123',
    })

    const response = await fetch(`http://127.0.0.1:${proxyPort}/?${query}`)

    expect(response.status).toBe(200)
    const upstreamUrl = new URL(rawFetchMock.mock.calls[0]![0] as string)
    expect(upstreamUrl.searchParams.get('center')).toBe('Melbourne')
    expect(upstreamUrl.searchParams.get('key')).toBe('server-key')
    expect(upstreamUrl.searchParams.has(SIG_PARAM)).toBe(false)
    expect(upstreamUrl.searchParams.has(PAGE_TOKEN_PARAM)).toBe(false)
    expect(upstreamUrl.searchParams.has(PAGE_TOKEN_TS_PARAM)).toBe(false)
  })

  it('rejects active content returned by the map upstream', async () => {
    rawFetchMock.mockResolvedValueOnce({
      _data: new TextEncoder().encode('<script>alert(1)</script>').buffer,
      headers: new Headers({ 'content-type': 'text/html' }),
      status: 200,
    })

    const response = await fetch(`http://127.0.0.1:${proxyPort}/?center=Melbourne`)

    expect(response.status).toBe(415)
  })
})
