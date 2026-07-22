import { beforeEach, describe, expect, it, vi } from 'vitest'

const { cacheDefinitions, hashMock, rawFetchMock } = vi.hoisted(() => ({
  cacheDefinitions: [] as Array<{ getKey?: (...args: any[]) => string }>,
  hashMock: vi.fn((value: unknown) => `hashed:${JSON.stringify(value)}`),
  rawFetchMock: vi.fn(),
}))

vi.mock('nitropack/runtime', () => ({
  defineCachedFunction: vi.fn((handler, options) => {
    cacheDefinitions.push(options)
    return handler
  }),
}))

vi.mock('ohash', () => ({
  hash: hashMock,
}))

vi.mock('ofetch', () => ({
  createFetch: vi.fn(() => Object.assign(vi.fn(), { raw: rawFetchMock })),
}))

const { createCachedBinaryFetch, createCachedJsonFetch } = await import(
  '../../packages/script/src/runtime/server/utils/cached-upstream',
)

beforeEach(() => {
  cacheDefinitions.length = 0
  hashMock.mockClear()
  rawFetchMock.mockReset()
})

describe('upstream cache keys', () => {
  it('hashes normalized JSON cache keys before passing them to Nitro storage', () => {
    const normalizeKey = vi.fn((url: string) => new URL(url).searchParams.get('actor') || url)
    createCachedJsonFetch('profile', 60, normalizeKey, {
      allowUrl: url => url.hostname === 'public.api.bsky.app',
    })

    const getKey = cacheDefinitions[0]?.getKey
    expect(getKey).toBeTypeOf('function')
    expect(getKey?.('https://public.api.bsky.app/profile?actor=nuxt.com')).toBe('hashed:"nuxt.com"')
    expect(normalizeKey).toHaveBeenCalledOnce()
    expect(hashMock).toHaveBeenCalledWith('nuxt.com')
  })

  it('rejects cached JSON redirects outside the upstream policy before fetching them', async () => {
    rawFetchMock.mockResolvedValueOnce({
      _data: undefined,
      headers: new Headers({ location: 'http://127.0.0.1/private' }),
      status: 302,
    })
    const fetchJson = createCachedJsonFetch('profile', 60, url => url, {
      allowUrl: url => url.protocol === 'https:' && url.hostname === 'public.api.bsky.app',
    })

    await expect(fetchJson('https://public.api.bsky.app/profile'))
      .rejects
      .toMatchObject({ statusCode: 403 })
    expect(rawFetchMock).toHaveBeenCalledOnce()
  })

  it('hashes binary URLs instead of exposing reserved characters to storage', () => {
    createCachedBinaryFetch('image', 60)

    const getKey = cacheDefinitions[0]?.getKey
    const url = 'https://cdn.example.com/image.jpg?width=640&format=webp'
    expect(getKey?.(url)).toBe(`hashed:${JSON.stringify(url)}`)
    expect(hashMock).toHaveBeenCalledWith(url)
  })

  it('uses stable binary option ordering and varies on response-error behavior', () => {
    createCachedBinaryFetch('image', 60)

    const getKey = cacheDefinitions[0]?.getKey
    const key = getKey?.('https://cdn.example.com/image.jpg', {
      headers: { Zebra: 'last', Accept: 'image/webp' },
      redirect: 'manual',
      ignoreResponseError: true,
    })

    expect(key).toBe('hashed:["https://cdn.example.com/image.jpg","Accept=image/webp","Zebra=last","redirect=manual","ignoreResponseError=true"]')
  })

  it('hashes Instagram embed URLs together with their response-varying headers', async () => {
    await import('../../packages/script/src/runtime/server/instagram-embed')

    const getKey = cacheDefinitions[0]?.getKey
    const key = getKey?.('https://www.instagram.com/p/example/embed/captioned/', {
      headers: {
        'User-Agent': 'Nuxt Scripts',
        'Accept': 'text/html',
      },
    })

    expect(key).toBe('hashed:"https://www.instagram.com/p/example/embed/captioned/\\nAccept=text/html\\nUser-Agent=Nuxt Scripts"')
  })

  it('checks every redirect target before fetching it', async () => {
    rawFetchMock.mockResolvedValueOnce({
      _data: undefined,
      headers: new Headers({ location: 'http://127.0.0.1/private' }),
      status: 302,
    })
    const fetchBinary = createCachedBinaryFetch('image', 60, {
      allowUrl: url => url.hostname === 'cdn.example.com',
    })

    await expect(fetchBinary('https://cdn.example.com/image', { redirect: 'follow' }))
      .rejects
      .toMatchObject({ statusCode: 403 })
    expect(rawFetchMock).toHaveBeenCalledOnce()
    expect(rawFetchMock).toHaveBeenCalledWith('https://cdn.example.com/image', expect.objectContaining({ redirect: 'manual' }))
  })

  it('refuses automatic redirects when the factory has no redirect policy', async () => {
    const fetchBinary = createCachedBinaryFetch('image', 60)

    await expect(fetchBinary('https://cdn.example.com/image', { redirect: 'follow' }))
      .rejects
      .toThrow('allowUrl redirect policy')
    expect(rawFetchMock).not.toHaveBeenCalled()
  })

  it('follows an allowlisted redirect and returns the final response', async () => {
    rawFetchMock
      .mockResolvedValueOnce({
        _data: undefined,
        headers: new Headers({ location: '/final' }),
        status: 302,
      })
      .mockResolvedValueOnce({
        _data: new TextEncoder().encode('image').buffer,
        headers: new Headers({ 'content-type': 'image/png' }),
        status: 200,
      })
    const fetchBinary = createCachedBinaryFetch('image', 60, {
      allowUrl: url => url.hostname === 'cdn.example.com',
    })

    const result = await fetchBinary('https://cdn.example.com/image', { redirect: 'follow' })

    expect(result.body.toString()).toBe('image')
    expect(result.contentType).toBe('image/png')
    expect(rawFetchMock).toHaveBeenCalledTimes(2)
    expect(rawFetchMock).toHaveBeenLastCalledWith('https://cdn.example.com/final', expect.objectContaining({ redirect: 'manual' }))
  })
})
