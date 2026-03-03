import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createApp, defineEventHandler, readBody, getHeaders, getRequestWebStream, toNodeListener, getRequestURL } from 'h3'
import { createServer, type Server } from 'node:http'
import { gzipSync } from 'node:zlib'

/**
 * Tests for #618: proxy handler must preserve compressed/binary request bodies.
 *
 * Mirrors proxy-handler.ts logic: when no privacy transforms are needed or the
 * body is binary/compressed, the raw request stream is piped directly to upstream
 * without reading or re-encoding it.
 */
describe('proxy handler - compressed binary payloads (#618)', () => {
  let upstreamServer: Server
  let proxyServer: Server
  let upstreamPort: number
  let proxyPort: number
  let capturedUpstreamBody: Buffer | null = null

  beforeAll(async () => {
    // Mock upstream: captures raw request bytes exactly as received
    const upstreamApp = createApp()
    upstreamApp.use('/', defineEventHandler(async (event) => {
      const chunks: Buffer[] = []
      for await (const chunk of event.node.req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
      }
      capturedUpstreamBody = Buffer.concat(chunks)
      return { status: 1 }
    }))

    upstreamServer = createServer(toNodeListener(upstreamApp))
    await new Promise<void>(resolve => upstreamServer.listen(0, resolve))
    upstreamPort = (upstreamServer.address() as any).port

    // Proxy: mirrors proxy-handler.ts body logic
    const proxyApp = createApp()
    proxyApp.use('/', defineEventHandler(async (event) => {
      const method = event.method?.toUpperCase()
      const originalHeaders = getHeaders(event)
      const contentType = originalHeaders['content-type'] || ''
      const anyPrivacy = originalHeaders['x-test-privacy'] === 'true'

      const compressionParam = getRequestURL(event).searchParams.get('compression')
      const isBinaryBody = Boolean(
        originalHeaders['content-encoding']
        || contentType.includes('octet-stream')
        || (compressionParam && /gzip|deflate|br|compress/i.test(compressionParam)),
      )

      const isWriteMethod = method === 'POST' || method === 'PUT' || method === 'PATCH'
      let passthroughBody = false
      let body: string | Record<string, unknown> | undefined

      if (isWriteMethod) {
        if (isBinaryBody || !anyPrivacy) {
          // Don't read the body — stream it through directly
          passthroughBody = true
        }
        else {
          const rawBody = await readBody(event)
          body = rawBody as string | Record<string, unknown>
        }
      }

      const headers: Record<string, string> = {}
      if (contentType)
        headers['content-type'] = contentType

      let fetchBody: BodyInit | undefined
      if (passthroughBody) {
        fetchBody = getRequestWebStream(event) as BodyInit | undefined
      }
      else if (body !== undefined) {
        fetchBody = typeof body === 'string' ? body : JSON.stringify(body)
      }

      const response = await fetch(`http://localhost:${upstreamPort}/batch`, {
        method: method || 'GET',
        headers,
        body: fetchBody,
        // @ts-expect-error Node fetch supports duplex for streaming request bodies
        duplex: passthroughBody ? 'half' : undefined,
      })
      return response.json()
    }))

    proxyServer = createServer(toNodeListener(proxyApp))
    await new Promise<void>(resolve => proxyServer.listen(0, resolve))
    proxyPort = (proxyServer.address() as any).port
  })

  afterAll(() => {
    upstreamServer?.close()
    proxyServer?.close()
  })

  beforeEach(() => {
    capturedUpstreamBody = null
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

  it('preserves gzip-js body when privacy is enabled without content-encoding', async () => {
    // PostHog gzip-js sends compressed bytes as text/plain with ?compression=gzip-js
    // and no content-encoding header. Even with privacy enabled, this must pass through raw.
    const payload = JSON.stringify({ event: 'test', ua: 'fingerprint' })
    const compressed = gzipSync(Buffer.from(payload))

    await fetch(`http://localhost:${proxyPort}/batch?compression=gzip-js`, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        'x-test-privacy': 'true',
      },
      body: compressed,
    })

    expect(capturedUpstreamBody).not.toBeNull()
    expect(Buffer.compare(capturedUpstreamBody!, compressed)).toBe(0)
  })

  it('preserves content-encoding gzip body even with privacy enabled', async () => {
    // content-encoding signals transport compression — body cannot be parsed,
    // so it must pass through raw even when privacy flags are active
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

  it('still handles JSON bodies correctly with privacy (regression)', async () => {
    const json = { event: '$pageview', properties: { url: 'https://example.com' } }

    await fetch(`http://localhost:${proxyPort}/batch`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test-privacy': 'true',
      },
      body: JSON.stringify(json),
    })

    expect(capturedUpstreamBody).not.toBeNull()
    const received = JSON.parse(capturedUpstreamBody!.toString('utf-8'))
    expect(received).toEqual(json)
  })

  it('streams JSON body through without re-parsing when no privacy', async () => {
    // Without privacy, even JSON bodies should pass through as-is (no readBody)
    const jsonStr = '{"event":"$pageview","properties":{"url":"https://example.com"}}'

    await fetch(`http://localhost:${proxyPort}/batch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: jsonStr,
    })

    expect(capturedUpstreamBody).not.toBeNull()
    // Byte-exact: no re-serialization, no key reordering
    expect(capturedUpstreamBody!.toString('utf-8')).toBe(jsonStr)
  })
})
