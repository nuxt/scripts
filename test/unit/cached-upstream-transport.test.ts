import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createServer } from 'node:http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { closeMock } = vi.hoisted(() => ({ closeMock: vi.fn() }))

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

// Only the private-address guard is replaced: it refuses loopback, which is
// where the test upstream lives. ofetch, undici, and the sockets are real, so
// the errors under test are the ones production sees.
vi.mock('../../packages/script/src/runtime/server/utils/network-host', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../packages/script/src/runtime/server/utils/network-host')>()
  return {
    ...actual,
    createPublicNetworkDispatcher: async () => ({ fetch: globalThis.fetch, close: closeMock }),
  }
})

const { createCachedJsonFetch } = await import(
  '../../packages/script/src/runtime/server/utils/cached-upstream',
)

let server: Server
let origin: string
let requests: string[]

function startServer(handle: (url: string, res: Parameters<Parameters<typeof createServer>[0]>[1]) => void): Promise<void> {
  return new Promise((resolve) => {
    server = createServer((req, res) => {
      requests.push(req.url || '')
      handle(req.url || '', res)
    })
    server.listen(0, '127.0.0.1', () => {
      origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      resolve()
    })
  })
}

function jsonFetch(maxAge = 600) {
  return createCachedJsonFetch<{ ok: boolean }>('transport', maxAge, url => url, {
    allowUrl: url => url.hostname === '127.0.0.1',
    contentTypePrefixes: ['application/json'],
  })
}

beforeEach(() => {
  requests = []
  closeMock.mockReset().mockResolvedValue(undefined)
})

afterEach(async () => {
  await new Promise<void>(resolve => server?.close(() => resolve()))
})

describe('real upstream transport failures', () => {
  it('reports a real upstream 503 as a gateway failure', async () => {
    await startServer((_url, res) => {
      res.writeHead(503, { 'content-type': 'application/json' })
      res.end('{"error":"rate limited"}')
    })

    await expect(jsonFetch()(`${origin}/profile`))
      .rejects
      .toMatchObject({ statusCode: 502, statusMessage: 'Upstream request failed' })
  })

  it('reports a refused connection as a gateway failure', async () => {
    await startServer((_url, res) => res.end('{}'))
    const port = (server.address() as AddressInfo).port
    await new Promise<void>(resolve => server.close(() => resolve()))

    await expect(jsonFetch()(`http://127.0.0.1:${port}/profile`))
      .rejects
      .toMatchObject({ statusCode: 502, statusMessage: 'Upstream request failed' })
  })

  it('reports an upstream that never answers as a gateway timeout', async () => {
    await startServer(() => {
      // Never respond; the request must be cut off by its own timeout.
    })

    await expect(jsonFetch()(`${origin}/profile`, { timeout: 150 }))
      .rejects
      .toMatchObject({ statusCode: 504, statusMessage: 'Gateway Timeout' })
  })

  it('reports an upstream that stalls mid-body as a gateway timeout', async () => {
    await startServer((_url, res) => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.write('{"ok"')
      // Headers and a partial body, then silence.
    })

    await expect(jsonFetch()(`${origin}/profile`, { timeout: 150 }))
      .rejects
      .toMatchObject({ statusCode: 504 })
  })

  it('stops re-fetching an upstream that keeps failing', async () => {
    await startServer((_url, res) => {
      res.writeHead(503, { 'content-type': 'application/json' })
      res.end('{"error":"rate limited"}')
    })
    const fetchProfile = jsonFetch()

    for (let i = 0; i < 5; i++)
      await expect(fetchProfile(`${origin}/profile`)).rejects.toMatchObject({ statusCode: 502 })

    expect(requests).toHaveLength(1)
  })

  it('tries the upstream again once the failure window closes', async () => {
    let failing = true
    await startServer((_url, res) => {
      if (failing) {
        res.writeHead(503, { 'content-type': 'application/json' })
        res.end('{"error":"rate limited"}')
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{"ok":true}')
    })
    // The replay window is capped by the cache's own maxAge, so a 1s cache
    // gives a 1s window.
    const fetchProfile = jsonFetch(1)

    await expect(fetchProfile(`${origin}/profile`)).rejects.toMatchObject({ statusCode: 502 })
    failing = false
    await expect(fetchProfile(`${origin}/profile`)).rejects.toMatchObject({ statusCode: 502 })

    await new Promise(resolve => setTimeout(resolve, 1100))

    await expect(fetchProfile(`${origin}/profile`)).resolves.toEqual({ ok: true })
    expect(requests).toHaveLength(2)
  })

  it('does not gate a resource the upstream still serves', async () => {
    await startServer((url, res) => {
      if (url.startsWith('/missing')) {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end('{"error":"gone"}')
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end('{"ok":true}')
    })
    const fetchProfile = jsonFetch()

    await expect(fetchProfile(`${origin}/missing`)).rejects.toMatchObject({ statusCode: 404 })
    await expect(fetchProfile(`${origin}/profile`)).resolves.toEqual({ ok: true })
  })
})
