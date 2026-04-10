import { describe, expect, it } from 'vitest'
import {
  buildSignedProxyUrl,
  canonicalizeQuery,
  constantTimeEqual,
  SIG_LENGTH,
  SIG_PARAM,
  signProxyUrl,
} from '../../packages/script/src/runtime/server/utils/sign'

const SECRET = 'test-secret-9f2c8b4e7a1d6f3c5b9e8a2d4f7c1b6e'

describe('canonicalizeQuery', () => {
  it('sorts keys alphabetically for order-independence', () => {
    expect(canonicalizeQuery({ b: '2', a: '1', c: '3' }))
      .toBe('a=1&b=2&c=3')
  })

  it('strips the sig param so it can never sign itself', () => {
    expect(canonicalizeQuery({ a: '1', sig: 'abc123' }))
      .toBe('a=1')
  })

  it('skips undefined and null values (matches ufo.withQuery)', () => {
    expect(canonicalizeQuery({ a: '1', b: undefined, c: null, d: '' }))
      .toBe('a=1&d=')
  })

  it('expands arrays to repeated keys in order', () => {
    expect(canonicalizeQuery({ markers: ['Sydney', 'Melbourne', 'Perth'] }))
      .toBe('markers=Sydney&markers=Melbourne&markers=Perth')
  })

  it('skips undefined and null items inside arrays', () => {
    expect(canonicalizeQuery({ a: ['x', undefined, 'y', null, 'z'] }))
      .toBe('a=x&a=y&a=z')
  })

  it('uRL-encodes keys and values', () => {
    expect(canonicalizeQuery({ 'q': 'hello world', 'a+b': 'c&d' }))
      .toBe('a%2Bb=c%26d&q=hello%20world')
  })

  it('jSON-stringifies object values for stable comparison', () => {
    expect(canonicalizeQuery({ style: { color: 'red' } }))
      .toBe('style=%7B%22color%22%3A%22red%22%7D')
  })

  it('coerces numbers and booleans via String()', () => {
    expect(canonicalizeQuery({ zoom: 15, enabled: true, ratio: 1.5 }))
      .toBe('enabled=true&ratio=1.5&zoom=15')
  })

  it('produces the same output regardless of insertion order', () => {
    const a = canonicalizeQuery({ zoom: 15, center: 'Sydney', size: '640x400' })
    const b = canonicalizeQuery({ size: '640x400', zoom: 15, center: 'Sydney' })
    expect(a).toBe(b)
  })
})

describe('signProxyUrl', () => {
  it('returns a 16-char hex signature', () => {
    const sig = signProxyUrl('/_scripts/proxy/google-static-maps', { center: 'Sydney' }, SECRET)
    expect(sig).toHaveLength(SIG_LENGTH)
    expect(sig).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic for the same input', () => {
    const a = signProxyUrl('/_scripts/proxy/x', { a: '1' }, SECRET)
    const b = signProxyUrl('/_scripts/proxy/x', { a: '1' }, SECRET)
    expect(a).toBe(b)
  })

  it('changes when the path changes (prevents cross-endpoint replay)', () => {
    const a = signProxyUrl('/_scripts/proxy/google-static-maps', { center: 'Sydney' }, SECRET)
    const b = signProxyUrl('/_scripts/proxy/google-maps-geocode', { center: 'Sydney' }, SECRET)
    expect(a).not.toBe(b)
  })

  it('changes when any query param changes', () => {
    const a = signProxyUrl('/p', { center: 'Sydney' }, SECRET)
    const b = signProxyUrl('/p', { center: 'Melbourne' }, SECRET)
    expect(a).not.toBe(b)
  })

  it('changes when the secret changes', () => {
    const a = signProxyUrl('/p', { center: 'Sydney' }, 'secret-a')
    const b = signProxyUrl('/p', { center: 'Sydney' }, 'secret-b')
    expect(a).not.toBe(b)
  })

  it('is insensitive to query key insertion order', () => {
    const a = signProxyUrl('/p', { a: '1', b: '2', c: '3' }, SECRET)
    const b = signProxyUrl('/p', { c: '3', a: '1', b: '2' }, SECRET)
    expect(a).toBe(b)
  })

  it('ignores a provided sig param in the query (signing is self-consistent)', () => {
    const a = signProxyUrl('/p', { a: '1' }, SECRET)
    const b = signProxyUrl('/p', { a: '1', sig: 'pre-existing-garbage' }, SECRET)
    expect(a).toBe(b)
  })
})

describe('buildSignedProxyUrl', () => {
  it('appends sig as the last query param', () => {
    const url = buildSignedProxyUrl('/_scripts/proxy/x', { a: '1' }, SECRET)
    expect(url).toMatch(new RegExp(`^/_scripts/proxy/x\\?a=1&${SIG_PARAM}=[0-9a-f]{${SIG_LENGTH}}$`))
  })

  it('works with empty query', () => {
    const url = buildSignedProxyUrl('/p', {}, SECRET)
    expect(url).toMatch(new RegExp(`^/p\\?${SIG_PARAM}=[0-9a-f]{${SIG_LENGTH}}$`))
  })

  it('round-trips through verify (via manually constructed event)', () => {
    const url = buildSignedProxyUrl('/_scripts/proxy/x', { center: 'Sydney', zoom: 15 }, SECRET)
    // Reuse signProxyUrl logic from a parsed URL to verify the embedded sig matches
    const [path, queryString] = url.split('?')
    const query: Record<string, unknown> = {}
    for (const pair of queryString!.split('&')) {
      const [k, v] = pair.split('=')
      query[decodeURIComponent(k!)] = decodeURIComponent(v!)
    }
    const embeddedSig = query[SIG_PARAM]
    const expectedSig = signProxyUrl(path!, query, SECRET)
    expect(embeddedSig).toBe(expectedSig)
  })
})

describe('constantTimeEqual', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeEqual('abc123', 'abc123')).toBe(true)
  })

  it('returns false for different strings of the same length', () => {
    expect(constantTimeEqual('abc123', 'abc124')).toBe(false)
  })

  it('returns false for strings of different length', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
  })

  it('returns true for empty strings', () => {
    expect(constantTimeEqual('', '')).toBe(true)
  })
})
