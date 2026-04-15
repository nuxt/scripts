import type { H3Event } from 'h3'
import { defineEventHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildSignedProxyUrl,
  generateProxyToken,
  PAGE_TOKEN_MAX_AGE,
  PAGE_TOKEN_PARAM,
  PAGE_TOKEN_TS_PARAM,
} from '../../packages/script/src/runtime/server/utils/sign'

// Hoisted runtime config mock — swapped between tests via `runtimeConfigMock`.
const { runtimeConfigMock } = vi.hoisted(() => ({
  runtimeConfigMock: {
    current: {} as Record<string, unknown>,
  },
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => runtimeConfigMock.current,
}))

// Import AFTER vi.mock so withSigning resolves against the mocked module.
const { withSigning } = await import('../../packages/script/src/runtime/server/utils/withSigning')

const SECRET = 'with-signing-test-secret'
const PATH = '/_scripts/proxy/google-static-maps'

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

const SENTINEL = { hello: 'world' }

const wrappedHandler = withSigning(defineEventHandler(() => SENTINEL))

beforeEach(() => {
  runtimeConfigMock.current = {}
})

describe('withSigning: no secret configured', () => {
  it('passes through without any verification', async () => {
    runtimeConfigMock.current = { 'nuxt-scripts': {} }
    const event = mockEvent(`${PATH}?center=Sydney`)
    const result = await wrappedHandler(event)
    expect(result).toBe(SENTINEL)
  })

  it('passes through even when the caller sends junk sig/token', async () => {
    runtimeConfigMock.current = { 'nuxt-scripts': undefined }
    const event = mockEvent(`${PATH}?center=Sydney&sig=deadbeef&${PAGE_TOKEN_PARAM}=xxx`)
    const result = await wrappedHandler(event)
    expect(result).toBe(SENTINEL)
  })
})

describe('withSigning: secret configured — URL signature mode', () => {
  beforeEach(() => {
    runtimeConfigMock.current = { 'nuxt-scripts': { proxySecret: SECRET } }
  })

  it('accepts a valid HMAC signature', async () => {
    const signed = buildSignedProxyUrl(PATH, { center: 'Sydney' }, SECRET)
    const event = mockEvent(signed)
    const result = await wrappedHandler(event)
    expect(result).toBe(SENTINEL)
  })

  it('rejects a missing signature with 403', async () => {
    const event = mockEvent(`${PATH}?center=Sydney`)
    await expect(wrappedHandler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a tampered signature with 403', async () => {
    const signed = buildSignedProxyUrl(PATH, { center: 'Sydney' }, SECRET)
    // Flip one char of the sig
    const tampered = signed.replace(/sig=([0-9a-f])/, (_m, c) => `sig=${c === 'a' ? 'b' : 'a'}`)
    const event = mockEvent(tampered)
    await expect(wrappedHandler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a signature built with the wrong secret', async () => {
    const signedWithOther = buildSignedProxyUrl(PATH, { center: 'Sydney' }, 'different-secret')
    const event = mockEvent(signedWithOther)
    await expect(wrappedHandler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects cross-endpoint replay of a signature', async () => {
    // Sig is for a different path; presenting it here with the same query shouldn't verify.
    const signedForOther = buildSignedProxyUrl('/_scripts/proxy/other', { center: 'Sydney' }, SECRET)
    const query = new URL(signedForOther, 'http://localhost').search
    const event = mockEvent(`${PATH}${query}`)
    await expect(wrappedHandler(event)).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('withSigning: secret configured — page token mode', () => {
  beforeEach(() => {
    runtimeConfigMock.current = { 'nuxt-scripts': { proxySecret: SECRET } }
  })

  it('accepts a fresh page token', async () => {
    const ts = Math.floor(Date.now() / 1000)
    const token = generateProxyToken(SECRET, ts)
    const event = mockEvent(`${PATH}?center=Sydney&${PAGE_TOKEN_PARAM}=${token}&${PAGE_TOKEN_TS_PARAM}=${ts}`)
    const result = await wrappedHandler(event)
    expect(result).toBe(SENTINEL)
  })

  it('rejects an expired page token', async () => {
    const staleTs = Math.floor(Date.now() / 1000) - PAGE_TOKEN_MAX_AGE - 10
    const token = generateProxyToken(SECRET, staleTs)
    const event = mockEvent(`${PATH}?center=Sydney&${PAGE_TOKEN_PARAM}=${token}&${PAGE_TOKEN_TS_PARAM}=${staleTs}`)
    await expect(wrappedHandler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a token that does not match its timestamp', async () => {
    const ts = Math.floor(Date.now() / 1000)
    const token = generateProxyToken(SECRET, ts)
    // Present the token with a different `_ts`, simulating forgery.
    const event = mockEvent(`${PATH}?center=Sydney&${PAGE_TOKEN_PARAM}=${token}&${PAGE_TOKEN_TS_PARAM}=${ts - 500}`)
    await expect(wrappedHandler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects a token forged with the wrong secret', async () => {
    const ts = Math.floor(Date.now() / 1000)
    const forgedToken = generateProxyToken('not-the-real-secret', ts)
    const event = mockEvent(`${PATH}?center=Sydney&${PAGE_TOKEN_PARAM}=${forgedToken}&${PAGE_TOKEN_TS_PARAM}=${ts}`)
    await expect(wrappedHandler(event)).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('withSigning: pageTokenMaxAge override', () => {
  it('applies a tighter max age when configured, rejecting tokens outside the window', async () => {
    runtimeConfigMock.current = {
      'nuxt-scripts': { proxySecret: SECRET, pageTokenMaxAge: 5 },
    }
    const ts = Math.floor(Date.now() / 1000) - 10 // 10s old; default would accept, maxAge=5 should not
    const token = generateProxyToken(SECRET, ts)
    const event = mockEvent(`${PATH}?center=Sydney&${PAGE_TOKEN_PARAM}=${token}&${PAGE_TOKEN_TS_PARAM}=${ts}`)
    await expect(wrappedHandler(event)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('extends the window when a larger max age is configured', async () => {
    runtimeConfigMock.current = {
      'nuxt-scripts': { proxySecret: SECRET, pageTokenMaxAge: PAGE_TOKEN_MAX_AGE * 24 },
    }
    const ts = Math.floor(Date.now() / 1000) - (PAGE_TOKEN_MAX_AGE + 100) // 1h+ old; default rejects, extended accepts
    const token = generateProxyToken(SECRET, ts)
    const event = mockEvent(`${PATH}?center=Sydney&${PAGE_TOKEN_PARAM}=${token}&${PAGE_TOKEN_TS_PARAM}=${ts}`)
    const result = await wrappedHandler(event)
    expect(result).toBe(SENTINEL)
  })
})
