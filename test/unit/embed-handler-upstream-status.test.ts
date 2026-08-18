import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { rawFetchMock } = vi.hoisted(() => ({ rawFetchMock: vi.fn() }))

// Nitro caches a resolved value and stores nothing when the resolver throws.
vi.mock('#nuxt-scripts/nitro', () => ({
  defineCachedFunction: (handler: (...args: any[]) => any, options: any) => {
    const store = new Map<string, unknown>()
    return async (...args: any[]) => {
      const key = options.getKey(...args)
      if (store.has(key))
        return store.get(key)
      const value = await handler(...args)
      store.set(key, value)
      return value
    }
  },
  useRuntimeConfig: () => ({}),
}))

vi.mock('ofetch', () => ({
  createFetch: vi.fn(() => Object.assign(vi.fn(), { raw: rawFetchMock })),
}))

const blueskyHandler = (await import('../../packages/script/src/runtime/server/bluesky-embed')).default
const instagramHandler = (await import('../../packages/script/src/runtime/server/instagram-embed')).default

function stream(body: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body))
      controller.close()
    },
  })
}

function upstreamStatus(status: number, statusText: string, contentType: string) {
  return {
    _data: stream('{"error":"upstream"}'),
    headers: new Headers({ 'content-type': contentType }),
    status,
    statusText,
  }
}

// Instagram answers a request it will not render with a JS-only shell.
const EMBED_SHELL = '<html><body><div id="splash-screen"></div></body></html>'

function serve(handler: any) {
  const app = createApp()
  app.use(handler)
  return createServer(toNodeListener(app))
}

describe('embed handlers report upstream faults as gateway errors', () => {
  let bluesky: Server
  let instagram: Server
  let blueskyPort: number
  let instagramPort: number

  beforeAll(async () => {
    bluesky = serve(blueskyHandler)
    instagram = serve(instagramHandler)
    await new Promise<void>(resolve => bluesky.listen(0, '127.0.0.1', resolve))
    await new Promise<void>(resolve => instagram.listen(0, '127.0.0.1', resolve))
    blueskyPort = (bluesky.address() as { port: number }).port
    instagramPort = (instagram.address() as { port: number }).port
  })

  beforeEach(() => {
    rawFetchMock.mockReset()
  })

  afterAll(async () => {
    await new Promise<void>(resolve => bluesky.close(() => resolve()))
    await new Promise<void>(resolve => instagram.close(() => resolve()))
  })

  function requestBluesky(handle = 'nuxt.com') {
    const post = encodeURIComponent(`https://bsky.app/profile/${handle}/post/abc123`)
    return fetch(`http://127.0.0.1:${blueskyPort}/_scripts/embed/bluesky?url=${post}`)
  }

  function requestInstagram(slug = 'example') {
    const post = encodeURIComponent(`https://www.instagram.com/p/${slug}/`)
    return fetch(`http://127.0.0.1:${instagramPort}/_scripts/embed/instagram?url=${post}`)
  }

  it('answers 502 when Bluesky is down rather than mirroring its 503', async () => {
    rawFetchMock.mockResolvedValue(upstreamStatus(503, 'Service Unavailable', 'application/json'))

    expect((await requestBluesky()).status).toBe(502)
  })

  it('answers 502 when Bluesky cannot be reached at all', async () => {
    rawFetchMock.mockRejectedValue(Object.assign(new Error('connect ECONNREFUSED'), { name: 'FetchError' }))

    expect((await requestBluesky('unreachable.test')).status).toBe(502)
  })

  it('answers 504 when Bluesky does not respond in time', async () => {
    rawFetchMock.mockRejectedValue(Object.assign(new Error('aborted'), {
      name: 'FetchError',
      cause: Object.assign(new Error('timed out'), { name: 'TimeoutError' }),
    }))

    expect((await requestBluesky('slow.test')).status).toBe(504)
  })

  it('answers 502 when Instagram serves its empty embed shell', async () => {
    rawFetchMock.mockResolvedValue({
      _data: stream(EMBED_SHELL),
      headers: new Headers({ 'content-type': 'text/html' }),
      status: 200,
    })

    expect((await requestInstagram()).status).toBe(502)
  })

  it('stops asking Instagram for a post it keeps refusing', async () => {
    rawFetchMock.mockResolvedValue({
      _data: stream(EMBED_SHELL),
      headers: new Headers({ 'content-type': 'text/html' }),
      status: 200,
    })

    for (let i = 0; i < 4; i++)
      expect((await requestInstagram('refused')).status).toBe(502)

    expect(rawFetchMock).toHaveBeenCalledOnce()
  })

  it('keeps a Bluesky 429 as the rate limit it is', async () => {
    rawFetchMock.mockResolvedValue(upstreamStatus(429, 'Too Many Requests', 'application/json'))

    expect((await requestBluesky('limited.test')).status).toBe(429)
  })
})
