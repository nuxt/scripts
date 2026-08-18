import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { closeMock, rawFetchMock } = vi.hoisted(() => ({
  closeMock: vi.fn(),
  rawFetchMock: vi.fn(),
}))

/**
 * Stand-in for Nitro's `defineCachedFunction`, following the three parts of its
 * contract this module depends on (nitropack `runtime/internal/cache.mjs`):
 *
 * 1. a resolved value is stored, and a thrown resolver stores nothing;
 * 2. a fresh entry is served without calling the resolver;
 * 3. under `swr` a stale entry is returned straight away while the resolver
 *    refreshes in the background, and a failed refresh is swallowed.
 */
vi.mock('#nuxt-scripts/nitro', () => ({
  defineCachedFunction: (handler: (...args: any[]) => any, options: any) => {
    const store = new Map<string, { value: unknown, mtime: number }>()
    return async (...args: any[]) => {
      const key = options.getKey(...args)
      const entry = store.get(key)
      const expired = !entry || Date.now() - entry.mtime > options.maxAge * 1000
      const resolve = expired
        ? handler(...args).then((value: unknown) => {
            store.set(key, { value, mtime: Date.now() })
            return value
          })
        : Promise.resolve(entry!.value)

      if (entry && options.swr) {
        // Nitro swallows a failed background refresh and keeps the stale entry.
        resolve.catch((error: unknown) => error)
        return entry.value
      }
      return resolve
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

  it('still serves a stale success while the upstream is failing', async () => {
    rawFetchMock.mockResolvedValueOnce(profile()).mockResolvedValue(rateLimited())
    const fetchProfile = createCachedJsonFetch<{ did: string }>('profile', 600, url => url, {
      allowUrl: url => url.hostname === 'public.api.bsky.app',
      contentTypePrefixes: ['application/json'],
    })

    await expect(fetchProfile('https://public.api.bsky.app/profile')).resolves.toEqual({ did: 'did:plc:example' })

    // Past the cache window, so every later call refreshes in the background
    // and every refresh now fails.
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(601 * 1000)
      await expect(fetchProfile('https://public.api.bsky.app/profile')).resolves.toEqual({ did: 'did:plc:example' })
      await Promise.resolve()
    }

    // The failure gate must not turn a working stale embed into a 502.
    vi.advanceTimersByTime(601 * 1000)
    await expect(fetchProfile('https://public.api.bsky.app/profile')).resolves.toEqual({ did: 'did:plc:example' })
    // One success plus a failed background refresh for every stale read.
    expect(rawFetchMock).toHaveBeenCalledTimes(6)
  })
})
