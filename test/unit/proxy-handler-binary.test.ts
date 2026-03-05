import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { gzipSync } from 'node:zlib'
import { createApp, defineEventHandler, getHeaders, readBody, readRawBody, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * Tests for #618: proxy handler must preserve compressed/binary request bodies.
 *
 * Uses the same body-handling logic as proxy-handler.ts to verify that:
 * - Binary/compressed payloads are passed through as raw bytes
 * - Text bodies with privacy transforms are still parsed and stripped correctly
 * - JSON bodies continue to work (regression)
 */
describe('proxy handler - compressed binary payloads (#618)', () => {
  let upstreamServer: Server
  let proxyServer: Server
  let upstreamPort: number
  let proxyPort: number
  let capturedUpstreamBody: Buffer | null = null
  // eslint-disable-next-line unused-imports/no-unused-vars
  let capturedUpstreamContentType: string | undefined

  beforeAll(async () => {
    // Mock upstream: captures raw request bytes exactly as received
    const upstreamApp = createApp()
    upstreamApp.use('/', defineEventHandler(async (event) => {
      const chunks: Buffer[] = []
      for await (const chunk of event.node.req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      capturedUpstreamBody = Buffer.concat(chunks)
      capturedUpstreamContentType = event.node.req.headers['content-type'] as string
      return { status: 1 }
    }))

    upstreamServer = createServer(toNodeListener(upstreamApp))
    await new Promise<void>(resolve => upstreamServer.listen(0, resolve))
    upstreamPort = (upstreamServer.address() as any).port

    // Proxy: mirrors proxy-handler.ts body processing logic (the fixed version)
    const proxyApp = createApp()
    proxyApp.use('/', defineEventHandler(async (event) => {
      const method = event.method?.toUpperCase()
      const originalHeaders = getHeaders(event)
      const contentType = originalHeaders['content-type'] || ''
      const anyPrivacy = originalHeaders['x-test-privacy'] === 'true'

      const isBinaryBody = Boolean(
        originalHeaders['content-encoding']
        || contentType.includes('octet-stream'),
      )

      let body: string | Record<string, unknown> | Buffer | undefined

      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        if (isBinaryBody || !anyPrivacy) {
          // Binary/compressed or no privacy — pass raw bytes through
          const raw = await readRawBody(event, false)
          body = raw ?? undefined
        }
        else {
          // Text body with privacy transforms — use readBody (parses JSON/form)
          const rawBody = await readBody(event)
          body = rawBody as string | Record<string, unknown>
        }
      }

      const headers: Record<string, string> = {}
      if (contentType)
        headers['content-type'] = contentType

      const response = await fetch(`http://localhost:${upstreamPort}/batch`, {
        method: method || 'GET',
        headers,
        body: body instanceof Buffer
          ? body
          : body
            ? (typeof body === 'string' ? body : JSON.stringify(body))
            : undefined,
      })
      return response.json()
    }))

    proxyServer = createServer(toNodeListener(proxyApp))
    await new Promise<void>(resolve => proxyServer.listen(0, resolve))
    proxyPort = (proxyServer.address() as any).port
  })

  beforeEach(() => {
    capturedUpstreamBody = null
    capturedUpstreamContentType = undefined
  })

  afterAll(() => {
    upstreamServer?.close()
    proxyServer?.close()
  })

  it('preserves gzip-compressed body sent as text/plain (PostHog gzip-js)', async () => {
    const payload = JSON.stringify({
      api_key: 'phc_test',
      batch: [{ event: '$pageview', properties: { $current_url: 'https://example.com' } }],
    })
    const compressed = gzipSync(Buffer.from(payload))

    await fetch(`http://localhost:${proxyPort}/batch?compression=gzip-js`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: compressed,
    })

    expect(capturedUpstreamBody).not.toBeNull()
    expect(Buffer.compare(capturedUpstreamBody!, compressed)).toBe(0)
  })

  it('preserves gzip-compressed body sent without content-type', async () => {
    const payload = JSON.stringify({ event: 'test', properties: {} })
    const compressed = gzipSync(Buffer.from(payload))

    await fetch(`http://localhost:${proxyPort}/batch?compression=gzip-js`, {
      method: 'POST',
      body: compressed,
    })

    expect(capturedUpstreamBody).not.toBeNull()
    expect(Buffer.compare(capturedUpstreamBody!, compressed)).toBe(0)
  })

  it('preserves raw binary body (application/octet-stream)', async () => {
    const binary = Buffer.from([0x00, 0x01, 0x80, 0xFF, 0xFE, 0xC0, 0xAF, 0x1F, 0x8B])

    await fetch(`http://localhost:${proxyPort}/batch`, {
      method: 'POST',
      headers: { 'content-type': 'application/octet-stream' },
      body: binary,
    })

    expect(capturedUpstreamBody).not.toBeNull()
    expect(Buffer.compare(capturedUpstreamBody!, binary)).toBe(0)
  })

  it('preserves content-encoding gzip body even with privacy enabled', async () => {
    // When content-encoding indicates compressed transport, body must pass through
    // raw even if privacy flags are active (can't strip compressed data)
    const payload = JSON.stringify({ event: 'test', ua: 'fingerprint' })
    const compressed = gzipSync(Buffer.from(payload))

    await fetch(`http://localhost:${proxyPort}/batch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-encoding': 'gzip',
        'x-test-privacy': 'true',
      },
      body: compressed,
    })

    expect(capturedUpstreamBody).not.toBeNull()
    expect(Buffer.compare(capturedUpstreamBody!, compressed)).toBe(0)
  })

  it('still handles JSON bodies correctly (regression)', async () => {
    const json = { event: '$pageview', properties: { url: 'https://example.com' } }

    await fetch(`http://localhost:${proxyPort}/batch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(json),
    })

    expect(capturedUpstreamBody).not.toBeNull()
    const received = JSON.parse(capturedUpstreamBody!.toString('utf-8'))
    expect(received).toEqual(json)
  })

  it('still handles form-encoded bodies correctly (regression)', async () => {
    const formData = 'event=%24pageview&url=https%3A%2F%2Fexample.com'

    await fetch(`http://localhost:${proxyPort}/batch`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formData,
    })

    expect(capturedUpstreamBody).not.toBeNull()
    expect(capturedUpstreamBody!.toString('utf-8')).toBe(formData)
  })
})
