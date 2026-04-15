import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  PAGE_TOKEN_PARAM,
  PAGE_TOKEN_TS_PARAM,
} from '../../packages/script/src/runtime/server/utils/sign-constants'

const tokenState = ref<{ token: string, ts: number } | null>(null)

vi.mock('../../packages/script/src/runtime/composables/useScriptProxyToken', () => ({
  useScriptProxyToken: () => tokenState,
}))

// Import after mock so the composable picks up the mocked token state.
const { useScriptProxyUrl } = await import(
  '../../packages/script/src/runtime/composables/useScriptProxyUrl',
)

beforeEach(() => {
  tokenState.value = null
})

describe('useScriptProxyUrl: no token', () => {
  it('returns path?k=v with no token params when state is null', () => {
    const build = useScriptProxyUrl()
    const result = build('/api/proxy', { k: 'v' })
    expect(result).toBe('/api/proxy?k=v')
    expect(result).not.toContain(PAGE_TOKEN_PARAM)
    expect(result).not.toContain(PAGE_TOKEN_TS_PARAM)
  })

  it('returns bare path when query is empty', () => {
    const build = useScriptProxyUrl()
    expect(build('/api/proxy', {})).toBe('/api/proxy')
    expect(build('/api/proxy')).toBe('/api/proxy')
  })
})

describe('useScriptProxyUrl: with token', () => {
  it('appends _pt=<token>&_ts=<ts> after existing query params', () => {
    tokenState.value = { token: 'abc123def4567890', ts: 1700000000 }
    const build = useScriptProxyUrl()
    const result = build('/api/proxy', { k: 'v' })
    expect(result).toBe(
      `/api/proxy?k=v&${PAGE_TOKEN_PARAM}=abc123def4567890&${PAGE_TOKEN_TS_PARAM}=1700000000`,
    )
  })

  it('attaches token params even when caller query is empty', () => {
    tokenState.value = { token: 'tok', ts: 42 }
    const build = useScriptProxyUrl()
    const result = build('/api/proxy', {})
    expect(result).toBe(`/api/proxy?${PAGE_TOKEN_PARAM}=tok&${PAGE_TOKEN_TS_PARAM}=42`)
  })

  it('places token params AFTER the caller-supplied query params', () => {
    tokenState.value = { token: 'tok', ts: 1 }
    const build = useScriptProxyUrl()
    const result = build('/api/proxy', { a: '1', b: '2' })
    const aIdx = result.indexOf('a=1')
    const bIdx = result.indexOf('b=2')
    const ptIdx = result.indexOf(`${PAGE_TOKEN_PARAM}=`)
    const tsIdx = result.indexOf(`${PAGE_TOKEN_TS_PARAM}=`)
    expect(aIdx).toBeGreaterThan(-1)
    expect(bIdx).toBeGreaterThan(aIdx)
    expect(ptIdx).toBeGreaterThan(bIdx)
    expect(tsIdx).toBeGreaterThan(ptIdx)
  })

  it('uRL-encodes the token value', () => {
    tokenState.value = { token: 'a/b=c&d', ts: 99 }
    const build = useScriptProxyUrl()
    const result = build('/api/proxy', {})
    expect(result).toContain(`${PAGE_TOKEN_PARAM}=${encodeURIComponent('a/b=c&d')}`)
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

describe('useScriptProxyUrl: reactive token reads', () => {
  it('reflects token state changes between calls', () => {
    const build = useScriptProxyUrl()

    // Start with no token
    expect(build('/api/proxy', { k: 'v' })).toBe('/api/proxy?k=v')

    // Set a token; next call should include it
    tokenState.value = { token: 'first', ts: 100 }
    expect(build('/api/proxy', { k: 'v' })).toBe(
      `/api/proxy?k=v&${PAGE_TOKEN_PARAM}=first&${PAGE_TOKEN_TS_PARAM}=100`,
    )

    // Swap token; next call should reflect the new one
    tokenState.value = { token: 'second', ts: 200 }
    expect(build('/api/proxy', { k: 'v' })).toBe(
      `/api/proxy?k=v&${PAGE_TOKEN_PARAM}=second&${PAGE_TOKEN_TS_PARAM}=200`,
    )

    // Clear token; next call should drop the params
    tokenState.value = null
    expect(build('/api/proxy', { k: 'v' })).toBe('/api/proxy?k=v')
  })
})
