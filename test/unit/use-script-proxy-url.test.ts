import { describe, expect, it } from 'vitest'
import { useScriptProxyUrl } from '../../packages/script/src/runtime/composables/useScriptProxyUrl'

describe('useScriptProxyUrl: basic', () => {
  it('returns path?k=v', () => {
    const build = useScriptProxyUrl()
    expect(build('/api/proxy', { k: 'v' })).toBe('/api/proxy?k=v')
  })

  it('returns bare path when query is empty', () => {
    const build = useScriptProxyUrl()
    expect(build('/api/proxy', {})).toBe('/api/proxy')
    expect(build('/api/proxy')).toBe('/api/proxy')
  })
})

describe('useScriptProxyUrl: query serialization', () => {
  it('uRL-encodes keys and values with special chars and unicode', () => {
    const build = useScriptProxyUrl()
    const result = build('/api/proxy', {
      'key&one': 'a=b',
      'path/part': 'x/y',
      'uni': 'naïve café',
    })
    expect(result).toContain(`${encodeURIComponent('key&one')}=${encodeURIComponent('a=b')}`)
    expect(result).toContain(`${encodeURIComponent('path/part')}=${encodeURIComponent('x/y')}`)
    expect(result).toContain(`uni=${encodeURIComponent('naïve café')}`)
  })

  it('skips undefined and null values', () => {
    const build = useScriptProxyUrl()
    const result = build('/api/proxy', {
      a: 'one',
      b: undefined,
      c: null,
      d: 'two',
    })
    expect(result).toBe('/api/proxy?a=one&d=two')
  })

  it('expands array values to repeated keys (input order preserved)', () => {
    const build = useScriptProxyUrl()
    const result = build('/api/proxy', { markers: ['a', 'b', 'c'] })
    expect(result).toBe('/api/proxy?markers=a&markers=b&markers=c')
  })

  it('skips null/undefined items inside arrays', () => {
    const build = useScriptProxyUrl()
    const result = build('/api/proxy', {
      tags: ['one', null as unknown as string, undefined as unknown as string, 'two'],
    })
    expect(result).toBe('/api/proxy?tags=one&tags=two')
  })
})
