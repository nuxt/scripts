import { describe, expect, it } from 'vitest'
import { buildProxyUrl } from '../../packages/script/src/runtime/server/utils/proxy-url'

describe('buildProxyUrl', () => {
  it('returns a URL with standard URL-encoding', () => {
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

  it('is deterministic: same inputs produce identical URLs', () => {
    const queryA = { a: '1', b: ['x', 'y'] }
    const queryB = { a: '1', b: ['x', 'y'] }
    expect(buildProxyUrl('/api/proxy', queryA)).toBe(buildProxyUrl('/api/proxy', queryB))
    expect(queryA).toEqual({ a: '1', b: ['x', 'y'] })
  })
})
