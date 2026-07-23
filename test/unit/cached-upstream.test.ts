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

vi.mock('../../packages/script/src/runtime/server/utils/network-host', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../packages/script/src/runtime/server/utils/network-host')>()
  return {
    ...actual,
    createPublicNetworkDispatcher: async () => ({
      fetch: globalThis.fetch,
      close: async () => {},
    }),
  }
})

const { createCachedBinaryFetch, createCachedJsonFetch } = await import(
  '../../packages/script/src/runtime/server/utils/cached-upstream',
)

beforeEach(() => {
  cacheDefinitions.length = 0
  hashMock.mockClear()
  rawFetchMock.mockReset()
})

function responseStream(...chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks)
        controller.enqueue(new TextEncoder().encode(chunk))
      controller.close()
    },
  })
}

describe('upstream response bounds', () => {
  it('times out a binary body that stalls after headers', async () => {
    vi.useFakeTimers()
    try {
      rawFetchMock.mockResolvedValueOnce({
        _data: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('partial'))
          },
        }),
        headers: new Headers({ 'content-type': 'image/png' }),
        status: 200,
      })
      const fetchBinary = createCachedBinaryFetch('image-timeout', 60, {
        allowUrl: url => url.hostname === 'cdn.example.com',
      })

      const result = expect(fetchBinary('https://cdn.example.com/image', { timeout: 50 }))
        .rejects
        .toMatchObject({ statusCode: 504 })
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(50)

      await result
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('rejects a binary body over its configured byte limit', async () => {
    rawFetchMock.mockResolvedValueOnce({
      _data: responseStream('123', '456'),
      headers: new Headers({ 'content-type': 'image/png' }),
      status: 200,
    })
    const fetchBinary = createCachedBinaryFetch('image-limit', 60, {
      allowUrl: url => url.hostname === 'cdn.example.com',
      maxResponseBytes: 5,
    })

    await expect(fetchBinary('https://cdn.example.com/image'))
      .rejects
      .toMatchObject({ statusCode: 502, statusMessage: 'Upstream response too large' })
  })

  it('rejects cached JSON over its configured byte limit', async () => {
    rawFetchMock.mockResolvedValueOnce({
      _data: responseStream('{"value":"too large"}'),
      headers: new Headers({ 'content-type': 'application/json' }),
      status: 200,
    })
    const fetchJson = createCachedJsonFetch('json-limit', 60, url => url, {
      allowUrl: url => url.hostname === 'api.example.com',
      maxResponseBytes: 8,
    })

    await expect(fetchJson('https://api.example.com/data'))
      .rejects
      .toMatchObject({ statusCode: 502, statusMessage: 'Upstream response too large' })
  })

  it('parses a bounded JSON response', async () => {
    rawFetchMock.mockResolvedValueOnce({
      _data: responseStream('{"status":"OK"}'),
      headers: new Headers({ 'content-type': 'application/json' }),
      status: 200,
    })
    const fetchJson = createCachedJsonFetch<{ status: string }>('json', 60, url => url, {
      allowUrl: url => url.hostname === 'api.example.com',
    })

    await expect(fetchJson('https://api.example.com/data')).resolves.toEqual({ status: 'OK' })
  })

  it('decodes a bounded text response', async () => {
    rawFetchMock.mockResolvedValueOnce({
      _data: responseStream('<p>embed</p>'),
      headers: new Headers({ 'content-type': 'text/html' }),
      status: 200,
    })
    const fetchText = createCachedJsonFetch<string>('text', 60, url => url, {
      allowUrl: url => url.hostname === 'embed.example.com',
      responseType: 'text',
    })

    await expect(fetchText('https://embed.example.com/post')).resolves.toBe('<p>embed</p>')
  })
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
        _data: responseStream('image'),
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
