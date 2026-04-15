import type { H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import {
  buildSignedProxyUrl,
  canonicalizeQuery,
  constantTimeEqual,
  generateProxyToken,
  PAGE_TOKEN_MAX_AGE,
  PAGE_TOKEN_PARAM,
  PAGE_TOKEN_TS_PARAM,
  SIG_LENGTH,
  SIG_PARAM,
  signProxyUrl,
  verifyProxyRequest,
  verifyProxyToken,
} from '../../packages/script/src/runtime/server/utils/sign'

/** Create a minimal mock H3Event with a path and query params. */
function mockEvent(url: string): H3Event {
  const parsed = new URL(url, 'http://localhost')
  const query: Record<string, string> = {}
  for (const [k, v] of parsed.searchParams.entries())
    query[k] = v
  return {
    path: parsed.pathname + parsed.search,
    _query: query,
  } as unknown as H3Event
}

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

describe('generateProxyToken', () => {
  it('returns a 16-char hex token', () => {
    const token = generateProxyToken(SECRET, 1712764800)
    expect(token).toHaveLength(SIG_LENGTH)
    expect(token).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic for the same secret and timestamp', () => {
    const a = generateProxyToken(SECRET, 1712764800)
    const b = generateProxyToken(SECRET, 1712764800)
    expect(a).toBe(b)
  })

  it('changes when timestamp changes', () => {
    const a = generateProxyToken(SECRET, 1712764800)
    const b = generateProxyToken(SECRET, 1712764801)
    expect(a).not.toBe(b)
  })

  it('changes when secret changes', () => {
    const a = generateProxyToken('secret-a', 1712764800)
    const b = generateProxyToken('secret-b', 1712764800)
    expect(a).not.toBe(b)
  })
})

describe('verifyProxyToken', () => {
  const ts = 1712764800
  const token = generateProxyToken(SECRET, ts)

  it('verifies a valid token within the time window', () => {
    expect(verifyProxyToken(token, ts, SECRET, PAGE_TOKEN_MAX_AGE, ts + 100)).toBe(true)
  })

  it('verifies a token at the exact boundary', () => {
    expect(verifyProxyToken(token, ts, SECRET, PAGE_TOKEN_MAX_AGE, ts + PAGE_TOKEN_MAX_AGE)).toBe(true)
  })

  it('rejects an expired token', () => {
    expect(verifyProxyToken(token, ts, SECRET, PAGE_TOKEN_MAX_AGE, ts + PAGE_TOKEN_MAX_AGE + 1)).toBe(false)
  })

  it('rejects a token from the far future (clock skew > 60s)', () => {
    expect(verifyProxyToken(token, ts, SECRET, PAGE_TOKEN_MAX_AGE, ts - 61)).toBe(false)
  })

  it('allows minor clock skew (up to 60s into the future)', () => {
    expect(verifyProxyToken(token, ts, SECRET, PAGE_TOKEN_MAX_AGE, ts - 30)).toBe(true)
  })

  it('rejects a tampered token', () => {
    expect(verifyProxyToken('0000000000000000', ts, SECRET)).toBe(false)
  })

  it('rejects a wrong-length token', () => {
    expect(verifyProxyToken('abc', ts, SECRET)).toBe(false)
  })

  it('rejects empty secret', () => {
    expect(verifyProxyToken(token, ts, '')).toBe(false)
  })

  it('rejects a token verified with the wrong secret', () => {
    expect(verifyProxyToken(token, ts, 'wrong-secret')).toBe(false)
  })

  it('rejects an empty token', () => {
    expect(verifyProxyToken('', ts, SECRET)).toBe(false)
  })

  it('rejects a non-numeric timestamp (NaN)', () => {
    expect(verifyProxyToken(token, Number.NaN, SECRET)).toBe(false)
  })

  it('rejects a timestamp that is not a number type', () => {
    // Guards against string ts leaking through at the boundary
    expect(verifyProxyToken(token, 'not-a-number' as unknown as number, SECRET)).toBe(false)
  })
})

describe('verifyProxyRequest', () => {
  it('verifies a valid URL signature (mode 1)', () => {
    const url = buildSignedProxyUrl('/_scripts/proxy/x', { center: 'Sydney' }, SECRET)
    const event = mockEvent(url)
    expect(verifyProxyRequest(event, SECRET)).toBe(true)
  })

  it('rejects a tampered URL signature', () => {
    const url = buildSignedProxyUrl('/_scripts/proxy/x', { center: 'Sydney' }, SECRET)
    const tampered = url.replace(/sig=[0-9a-f]+/, 'sig=0000000000000000')
    const event = mockEvent(tampered)
    expect(verifyProxyRequest(event, SECRET)).toBe(false)
  })

  it('rejects a request with no sig and no page token', () => {
    const event = mockEvent('/_scripts/proxy/x?center=Sydney')
    expect(verifyProxyRequest(event, SECRET)).toBe(false)
  })

  it('returns false when secret is empty', () => {
    const url = buildSignedProxyUrl('/_scripts/proxy/x', { center: 'Sydney' }, SECRET)
    const event = mockEvent(url)
    expect(verifyProxyRequest(event, '')).toBe(false)
  })

  it('verifies a valid page token (mode 2)', () => {
    const ts = Math.floor(Date.now() / 1000)
    const token = generateProxyToken(SECRET, ts)
    const event = mockEvent(`/_scripts/proxy/x?center=Sydney&${PAGE_TOKEN_PARAM}=${token}&${PAGE_TOKEN_TS_PARAM}=${ts}`)
    expect(verifyProxyRequest(event, SECRET)).toBe(true)
  })

  it('rejects an expired page token', () => {
    const ts = Math.floor(Date.now() / 1000) - PAGE_TOKEN_MAX_AGE - 100
    const token = generateProxyToken(SECRET, ts)
    const event = mockEvent(`/_scripts/proxy/x?center=Sydney&${PAGE_TOKEN_PARAM}=${token}&${PAGE_TOKEN_TS_PARAM}=${ts}`)
    expect(verifyProxyRequest(event, SECRET)).toBe(false)
  })

  it('allows page token with different query params than original (any-params mode)', () => {
    const ts = Math.floor(Date.now() / 1000)
    const token = generateProxyToken(SECRET, ts)
    // Token was generated without any query context, so it works with any params
    const event = mockEvent(`/_scripts/proxy/x?center=Melbourne&zoom=10&${PAGE_TOKEN_PARAM}=${token}&${PAGE_TOKEN_TS_PARAM}=${ts}`)
    expect(verifyProxyRequest(event, SECRET)).toBe(true)
  })

  it('prefers URL signature over page token when both are present', () => {
    const ts = Math.floor(Date.now() / 1000)
    const pageToken = generateProxyToken(SECRET, ts)
    // Build a signed URL and also add a page token
    const signedUrl = buildSignedProxyUrl('/_scripts/proxy/x', { center: 'Sydney' }, SECRET)
    const event = mockEvent(`${signedUrl}&${PAGE_TOKEN_PARAM}=${pageToken}&${PAGE_TOKEN_TS_PARAM}=${ts}`)
    expect(verifyProxyRequest(event, SECRET)).toBe(true)
  })

  it('rejects a URL signature built with the wrong secret', () => {
    // Valid structure/length but signed under a different secret
    const badUrl = buildSignedProxyUrl('/_scripts/proxy/x', { center: 'Sydney' }, 'other-secret')
    const event = mockEvent(badUrl)
    expect(verifyProxyRequest(event, SECRET)).toBe(false)
  })

  it('rejects a signature valid for a different path (cross-endpoint replay defense)', () => {
    // Sign for path A, then present the same sig on path B with identical query
    const query = { center: 'Sydney' }
    const sigForA = signProxyUrl('/_scripts/proxy/a', query, SECRET)
    const event = mockEvent(`/_scripts/proxy/b?center=Sydney&${SIG_PARAM}=${sigForA}`)
    expect(verifyProxyRequest(event, SECRET)).toBe(false)
  })

  it('rejects a page token that does not match the given timestamp', () => {
    const ts = Math.floor(Date.now() / 1000)
    const tokenForOtherTs = generateProxyToken(SECRET, ts - 500)
    const event = mockEvent(`/_scripts/proxy/x?${PAGE_TOKEN_PARAM}=${tokenForOtherTs}&${PAGE_TOKEN_TS_PARAM}=${ts}`)
    expect(verifyProxyRequest(event, SECRET)).toBe(false)
  })

  it('rejects a page token with a non-numeric timestamp', () => {
    const ts = Math.floor(Date.now() / 1000)
    const token = generateProxyToken(SECRET, ts)
    const event = mockEvent(`/_scripts/proxy/x?${PAGE_TOKEN_PARAM}=${token}&${PAGE_TOKEN_TS_PARAM}=not-a-number`)
    expect(verifyProxyRequest(event, SECRET)).toBe(false)
  })

  it('respects a custom maxAge override (tighter than the default)', () => {
    // Token is 10 seconds old; default PAGE_TOKEN_MAX_AGE (3600) would accept it,
    // but a 5-second maxAge must reject it.
    const ts = Math.floor(Date.now() / 1000) - 10
    const token = generateProxyToken(SECRET, ts)
    const event = mockEvent(`/_scripts/proxy/x?${PAGE_TOKEN_PARAM}=${token}&${PAGE_TOKEN_TS_PARAM}=${ts}`)
    expect(verifyProxyRequest(event, SECRET, 3600)).toBe(true)
    expect(verifyProxyRequest(event, SECRET, 5)).toBe(false)
  })
})
