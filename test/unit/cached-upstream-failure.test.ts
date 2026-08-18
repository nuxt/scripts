import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { closeMock, rawFetchMock } = vi.hoisted(() => ({
  closeMock: vi.fn(),
  rawFetchMock: vi.fn(),
}))

// Nitro caches a resolved value and stores nothing when the resolver throws.
// This stand-in keeps that contract so the failure gate is what is under test.
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

vi.mock('../../packages/script/src/runtime/server/utils/network-host', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../packages/script/src/runtime/server/utils/network-host')>()
  return {
    ...actual,
    createPublicNetworkDispatcher: async () => ({ fetch: globalThis.fetch, close: closeMock }),
  }
})

const { createCachedJsonFetch, UPSTREAM_FAILURE_MAX_AGE } = await import(
  '../../packages/script/src/runtime/server/utils/cached-upstream',
)

function responseStream(body: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body))
      controller.close()
    },
  })
}

function rateLimited() {
  return {
    _data: responseStream('rate limited'),
    headers: new Headers({ 'content-type': 'application/json' }),
    status: 503,
    statusText: 'Service Unavailable',
  }
}

function profile() {
  return {
    _data: responseStream('{"did":"did:plc:example"}'),
    headers: new Headers({ 'content-type': 'application/json' }),
    status: 200,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  closeMock.mockReset().mockResolvedValue(undefined)
  rawFetchMock.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('upstream failure caching', () => {
  it('serves a failing upstream from cache instead of re-fetching it', async () => {
    rawFetchMock.mockResolvedValue(rateLimited())
    const fetchProfile = createCachedJsonFetch('profile', 600, url => url, {
      allowUrl: url => url.hostname === 'public.api.bsky.app',
      contentTypePrefixes: ['application/json'],
    })

    for (let i = 0; i < 3; i++) {
      await expect(fetchProfile('https://public.api.bsky.app/profile'))
        .rejects
        .toMatchObject({ statusCode: 502, statusMessage: 'Upstream request failed' })
    }

    expect(rawFetchMock).toHaveBeenCalledOnce()
  })

  it('retries the upstream once the failure window closes', async () => {
    rawFetchMock.mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(profile())
    const fetchProfile = createCachedJsonFetch<{ did: string }>('profile', 600, url => url, {
      allowUrl: url => url.hostname === 'public.api.bsky.app',
      contentTypePrefixes: ['application/json'],
    })

    await expect(fetchProfile('https://public.api.bsky.app/profile')).rejects.toMatchObject({ statusCode: 502 })
    vi.advanceTimersByTime(UPSTREAM_FAILURE_MAX_AGE * 1000 + 1)

    await expect(fetchProfile('https://public.api.bsky.app/profile')).resolves.toEqual({ did: 'did:plc:example' })
    expect(rawFetchMock).toHaveBeenCalledTimes(2)
  })

  it('caches a failure for no longer than the success it replaces', async () => {
    rawFetchMock.mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(profile())
    const fetchProfile = createCachedJsonFetch<{ did: string }>('profile', 10, url => url, {
      allowUrl: url => url.hostname === 'public.api.bsky.app',
      contentTypePrefixes: ['application/json'],
    })

    await expect(fetchProfile('https://public.api.bsky.app/profile')).rejects.toMatchObject({ statusCode: 502 })
    vi.advanceTimersByTime(11 * 1000)

    await expect(fetchProfile('https://public.api.bsky.app/profile')).resolves.toEqual({ did: 'did:plc:example' })
  })

  it('keeps serving a cached success after the upstream starts failing', async () => {
    rawFetchMock.mockResolvedValueOnce(profile()).mockResolvedValue(rateLimited())
    const fetchProfile = createCachedJsonFetch<{ did: string }>('profile', 600, url => url, {
      allowUrl: url => url.hostname === 'public.api.bsky.app',
      contentTypePrefixes: ['application/json'],
    })

    await expect(fetchProfile('https://public.api.bsky.app/profile')).resolves.toEqual({ did: 'did:plc:example' })
    await expect(fetchProfile('https://public.api.bsky.app/profile')).resolves.toEqual({ did: 'did:plc:example' })
    expect(rawFetchMock).toHaveBeenCalledOnce()
  })
})
