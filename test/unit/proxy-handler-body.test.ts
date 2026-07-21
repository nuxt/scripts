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
  let capturedContentType: string | undefined
  const realFetch = globalThis.fetch

  beforeAll(async () => {
    const upstreamApp = createApp()
    upstreamApp.use('/', defineEventHandler(async (event) => {
      const rawBody = await readRawBody(event, false)
      capturedBody = rawBody ? Buffer.from(rawBody) : Buffer.alloc(0)
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
    const formBody = 'event=%24pageview&tag=a&tag=b&sr=2560x1440'

    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody,
    })

    expect(response.status).toBe(200)
    expect(capturedBody.toString()).toBe('event=%24pageview&tag=a&tag=b&sr=1920x1080')
    expect(capturedContentType).toBe('application/x-www-form-urlencoded')
  })
})
