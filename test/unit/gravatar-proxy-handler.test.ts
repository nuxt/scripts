import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { rawFetchMock } = vi.hoisted(() => ({ rawFetchMock: vi.fn() }))

vi.mock('nitropack/runtime', () => ({
  defineCachedFunction: (handler: (...args: any[]) => any) => handler,
  useRuntimeConfig: () => ({ public: { 'nuxt-scripts': { gravatarProxy: { cacheMaxAge: 60 } } } }),
}))

vi.mock('ofetch', () => ({
  $fetch: Object.assign(vi.fn(), { raw: rawFetchMock }),
}))

const gravatarHandler = (await import('../../packages/script/src/runtime/server/gravatar-proxy')).default
const VALID_HASH = 'a'.repeat(64)

describe('gravatar proxy input and response boundaries', () => {
  let proxyServer: Server
  let proxyPort: number

  beforeAll(async () => {
    const app = createApp()
    app.use(gravatarHandler)
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

  function request(query: string) {
    return fetch(`http://127.0.0.1:${proxyPort}/?${query}`)
  }

  it.each([
    [`hash=${'a'.repeat(63)}`, 'invalid hash'],
    [`hash=${VALID_HASH}&s=2049`, 'oversized image'],
    [`hash=${VALID_HASH}&r=unrated`, 'invalid rating'],
  ])('rejects %s before calling Gravatar', async (query) => {
    const response = await request(query)

    expect(response.status).toBe(400)
    expect(rawFetchMock).not.toHaveBeenCalled()
  })

  it('rejects active content returned by the image upstream', async () => {
    rawFetchMock.mockResolvedValueOnce({
      _data: new TextEncoder().encode('<script>alert(1)</script>').buffer,
      headers: new Headers({ 'content-type': 'text/html' }),
      status: 200,
    })

    const response = await request(`hash=${VALID_HASH}`)

    expect(response.status).toBe(415)
  })
})
