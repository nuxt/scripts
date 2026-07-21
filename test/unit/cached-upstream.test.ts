import { beforeEach, describe, expect, it, vi } from 'vitest'

const { cacheDefinitions, hashMock } = vi.hoisted(() => ({
  cacheDefinitions: [] as Array<{ getKey?: (...args: any[]) => string }>,
  hashMock: vi.fn((value: unknown) => `hashed:${JSON.stringify(value)}`),
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
  $fetch: Object.assign(vi.fn(), { raw: vi.fn() }),
}))

const { createCachedBinaryFetch, createCachedJsonFetch } = await import(
  '../../packages/script/src/runtime/server/utils/cached-upstream',
)

beforeEach(() => {
  cacheDefinitions.length = 0
  hashMock.mockClear()
})

describe('upstream cache keys', () => {
  it('hashes normalized JSON cache keys before passing them to Nitro storage', () => {
    const normalizeKey = vi.fn((url: string) => new URL(url).searchParams.get('actor') || url)
    createCachedJsonFetch('profile', 60, normalizeKey)

    const getKey = cacheDefinitions[0]?.getKey
    expect(getKey).toBeTypeOf('function')
    expect(getKey?.('https://public.api.bsky.app/profile?actor=nuxt.com')).toBe('hashed:"nuxt.com"')
    expect(normalizeKey).toHaveBeenCalledOnce()
    expect(hashMock).toHaveBeenCalledWith('nuxt.com')
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
      'User-Agent': 'Nuxt Scripts',
      'Accept': 'text/html',
    })

    expect(key).toBe('hashed:["https://www.instagram.com/p/example/embed/captioned/","Accept=text/html","User-Agent=Nuxt Scripts"]')
  })
})
