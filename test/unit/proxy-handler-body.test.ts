import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { gzipSync } from 'node:zlib'
import { createApp, defineEventHandler, readRawBody, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import proxyHandler from '../../packages/script/src/runtime/server/proxy-handler'

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({
    'nuxt-scripts-proxy': {
      proxyPrefix: '/_scripts/p',
      domainPrivacy: {
        'upstream.test': true,
      },
      debug: false,
    },
  }),
  useNitroApp: () => ({
    hooks: { callHook: async () => {} },
  }),
}))

describe('proxy handler request bodies (#836)', () => {
  let upstreamServer: Server
  let proxyServer: Server
  let upstreamPort: number
  let proxyPort: number
  let capturedBody = Buffer.alloc(0)
  let capturedContentLength: string | undefined
  let capturedContentType: string | undefined
  const realFetch = globalThis.fetch

  beforeAll(async () => {
    const upstreamApp = createApp()
    upstreamApp.use('/', defineEventHandler(async (event) => {
      const rawBody = await readRawBody(event, false)
      capturedBody = rawBody ? Buffer.from(rawBody) : Buffer.alloc(0)
      capturedContentLength = event.headers.get('content-length') ?? undefined
      capturedContentType = event.headers.get('content-type') ?? undefined
      return { status: 1 }
    }))

    upstreamServer = createServer(toNodeListener(upstreamApp))
    await new Promise<void>(resolve => upstreamServer.listen(0, resolve))
    upstreamPort = (upstreamServer.address() as { port: number }).port

    globalThis.fetch = (input, init) => {
      const requestUrl = input instanceof Request ? input.url : String(input)
      const url = new URL(requestUrl)
      if (url.hostname === 'upstream.test') {
        const redirected = `http://127.0.0.1:${upstreamPort}${url.pathname}${url.search}`
        return realFetch(redirected, init)
      }
      return realFetch(input, init)
    }

    const proxyApp = createApp()
    proxyApp.use(proxyHandler)
    proxyServer = createServer(toNodeListener(proxyApp))
    await new Promise<void>(resolve => proxyServer.listen(0, resolve))
    proxyPort = (proxyServer.address() as { port: number }).port
  })

  beforeEach(() => {
    capturedBody = Buffer.alloc(0)
    capturedContentLength = undefined
    capturedContentType = undefined
  })

  afterAll(async () => {
    globalThis.fetch = realFetch
    await Promise.all([
      new Promise<void>(resolve => upstreamServer.close(() => resolve())),
      new Promise<void>(resolve => proxyServer.close(() => resolve())),
    ])
  })

  it('preserves an opaque gzip body without a compression query parameter', async () => {
    const compressed = gzipSync(JSON.stringify({ event: '$pageview' }))

    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: compressed,
    })

    expect(response.status).toBe(200)
    expect(capturedBody.equals(compressed)).toBe(true)
    expect(capturedContentType).toBe('text/plain')
  })

  it('preserves form encoding when privacy transforms are active', async () => {
    const formBody = 'tag=a&event=%24pageview&tag=b&hardwareConcurrency=128'
    const transformedBody = 'tag=a&event=%24pageview&tag=b&hardwareConcurrency=16'

    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody,
    })

    expect(response.status).toBe(200)
    expect(capturedBody.toString()).toBe(transformedBody)
    expect(capturedContentLength).toBe(String(Buffer.byteLength(transformedBody)))
    expect(capturedContentLength).not.toBe(String(Buffer.byteLength(formBody)))
    expect(capturedContentType).toBe('application/x-www-form-urlencoded')
  })

  it('applies privacy transforms to JSON objects and arrays', async () => {
    const bodies = [
      {
        input: { event: '$pageview', sr: '2560x1440' },
        expected: { event: '$pageview', sr: '1920x1080' },
      },
      {
        input: [{ hardwareConcurrency: 128 }, 'unchanged'],
        expected: [{ hardwareConcurrency: 16 }, 'unchanged'],
      },
    ]

    for (const { input, expected } of bodies) {
      const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/i/v0/e/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })

      expect(response.status).toBe(200)
      expect(JSON.parse(capturedBody.toString())).toEqual(expected)
    }
  })

  it.each([
    ['string', '"value"'],
    ['number', '42'],
    ['boolean', 'true'],
    ['null', 'null'],
  ])('preserves JSON %s primitives', async (_name, jsonBody) => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: jsonBody,
    })

    expect(response.status).toBe(200)
    expect(capturedBody.toString()).toBe(jsonBody)
  })

  it('rejects malformed JSON before forwarding upstream', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"event":',
    })

    expect(response.status).toBe(400)
    expect(capturedBody).toHaveLength(0)
  })
})
