import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PAGE_TOKEN_PARAM, PAGE_TOKEN_TS_PARAM, SIG_PARAM } from '../../packages/script/src/runtime/server/utils/sign-constants'

const { rawFetchMock } = vi.hoisted(() => ({ rawFetchMock: vi.fn() }))

vi.mock('nitropack/runtime', () => ({
  defineCachedFunction: (handler: (...args: any[]) => any) => handler,
  useRuntimeConfig: () => ({
    'nuxt-scripts': { googleMapsGeocodeProxy: { apiKey: 'server-key' } },
    'public': {},
  }),
}))

vi.mock('ofetch', () => ({
  $fetch: Object.assign(vi.fn(), { raw: rawFetchMock }),
}))

const geocodeHandler = (await import('../../packages/script/src/runtime/server/google-maps-geocode-proxy')).default

describe('google geocode proxy', () => {
  let proxyServer: Server
  let proxyPort: number

  beforeAll(async () => {
    const app = createApp()
    app.use(geocodeHandler)
    proxyServer = createServer(toNodeListener(app))
    await new Promise<void>(resolve => proxyServer.listen(0, '127.0.0.1', resolve))
    proxyPort = (proxyServer.address() as { port: number }).port
  })

  beforeEach(() => {
    rawFetchMock.mockReset()
    rawFetchMock.mockResolvedValue({
      _data: { status: 'OK', results: [] },
      headers: new Headers({ 'content-type': 'application/json' }),
      status: 200,
    })
  })

  afterAll(async () => {
    await new Promise<void>(resolve => proxyServer.close(() => resolve()))
  })

  it('never forwards proxy credentials or a client API key upstream', async () => {
    const query = new URLSearchParams({
      address: 'Melbourne',
      key: 'client-key',
      [SIG_PARAM]: 'signature',
      [PAGE_TOKEN_PARAM]: 'page-token',
      [PAGE_TOKEN_TS_PARAM]: '123',
    })

    const response = await fetch(`http://127.0.0.1:${proxyPort}/?${query}`)

    expect(response.status).toBe(200)
    const upstreamUrl = new URL(rawFetchMock.mock.calls[0]![0] as string)
    expect(upstreamUrl.searchParams.get('address')).toBe('Melbourne')
    expect(upstreamUrl.searchParams.get('key')).toBe('server-key')
    expect(upstreamUrl.searchParams.has(SIG_PARAM)).toBe(false)
    expect(upstreamUrl.searchParams.has(PAGE_TOKEN_PARAM)).toBe(false)
    expect(upstreamUrl.searchParams.has(PAGE_TOKEN_TS_PARAM)).toBe(false)
  })
})
