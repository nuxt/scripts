import { describe, expect, it } from 'vitest'
import { buildProxyUrl } from '../../packages/script/src/runtime/server/utils/proxy-url'
import { buildSignedProxyUrl, SIG_PARAM } from '../../packages/script/src/runtime/server/utils/sign'

const SECRET = 'test-secret-9f2c8b4e7a1d6f3c5b9e8a2d4f7c1b6e'

describe('buildProxyUrl: unsigned (no secret)', () => {
  it('returns unsigned URL with standard URL-encoding', () => {
    const result = buildProxyUrl('/api/proxy', { k: 'v', foo: 'bar' })
    expect(result).toBe('/api/proxy?k=v&foo=bar')
  })

  it('returns just the path when query is empty (no trailing ?)', () => {
    expect(buildProxyUrl('/api/proxy', {})).toBe('/api/proxy')
  })

  it('skips undefined and null values', () => {
    const result = buildProxyUrl('/api/proxy', {
      a: 'one',
      b: undefined,
      c: null,
      d: 'two',
    })
    expect(result).toBe('/api/proxy?a=one&d=two')
  })

  it('expands array values to repeated keys in input order', () => {
    const result = buildProxyUrl('/api/proxy', { markers: ['a', 'b'] })
    expect(result).toBe('/api/proxy?markers=a&markers=b')
  })

  it('preserves array order across multiple items', () => {
    const result = buildProxyUrl('/api/proxy', { x: ['3', '1', '2'] })
    expect(result).toBe('/api/proxy?x=3&x=1&x=2')
  })

  it('uRL-encodes keys and values with special characters', () => {
    const result = buildProxyUrl('/api/proxy', {
      'key&one': 'a=b',
      'path/part': 'x/y',
      'uni': 'naïve café',
    })
    expect(result).toContain(`${encodeURIComponent('key&one')}=${encodeURIComponent('a=b')}`)
    expect(result).toContain(`${encodeURIComponent('path/part')}=${encodeURIComponent('x/y')}`)
    expect(result).toContain(`uni=${encodeURIComponent('naïve café')}`)
  })

  it('skips null/undefined items inside arrays', () => {
    const result = buildProxyUrl('/api/proxy', {
      tags: ['one', null as unknown as string, undefined as unknown as string, 'two'],
    })
    expect(result).toBe('/api/proxy?tags=one&tags=two')
  })
})

describe('buildProxyUrl: signed (with secret)', () => {
  it('appends a 16-char hex sig as the last query param', () => {
    const result = buildProxyUrl('/api/proxy', { k: 'v' }, SECRET)
    expect(result).toMatch(new RegExp(`&${SIG_PARAM}=[a-f0-9]{16}$`))
  })

  it('emits ?sig=... when there is no other query', () => {
    const result = buildProxyUrl('/api/proxy', {}, SECRET)
    expect(result).toMatch(new RegExp(`^/api/proxy\\?${SIG_PARAM}=[a-f0-9]{16}$`))
  })

  it('delegates to buildSignedProxyUrl (produces identical output)', () => {
    const query = { url: 'https://example.com/img.jpg', w: 640 }
    expect(buildProxyUrl('/api/proxy', query, SECRET)).toBe(
      buildSignedProxyUrl('/api/proxy', query, SECRET),
    )
  })

  it('is deterministic: same inputs produce identical URLs', () => {
    const query = { a: '1', b: ['x', 'y'] }
    const a = buildProxyUrl('/api/proxy', query, SECRET)
    const b = buildProxyUrl('/api/proxy', query, SECRET)
    expect(a).toBe(b)
  })

  it('different secrets produce different signatures', () => {
    const query = { k: 'v' }
    const a = buildProxyUrl('/api/proxy', query, SECRET)
    const b = buildProxyUrl('/api/proxy', query, 'different-secret-value')
    expect(a).not.toBe(b)

    const sigA = a.match(/sig=([a-f0-9]+)$/)?.[1]
    const sigB = b.match(/sig=([a-f0-9]+)$/)?.[1]
    expect(sigA).toBeTruthy()
    expect(sigB).toBeTruthy()
    expect(sigA).not.toBe(sigB)
  })
})
