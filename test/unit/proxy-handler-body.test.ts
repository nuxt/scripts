import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { gzipSync } from 'node:zlib'
import { createApp, defineEventHandler, getRequestURL, readRawBody, sendRedirect, setHeader, setResponseStatus, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import proxyHandler, { withResponseBodyIdleTimeout } from '../../packages/script/src/runtime/server/proxy-handler'

vi.mock('#nuxt-scripts/nitro', () => ({
  useRuntimeConfig: () => ({
    'nuxt-scripts-proxy': {
      proxyPrefix: '/_scripts/p',
      domainPrivacy: {
        '127.0.0.1': true,
        'upstream.test': true,
        'redirect.test': true,
      },
      debug: false,
    },
  }),
  useNitroApp: () => ({
    hooks: { callHook: async () => {} },
  }),
}))

vi.mock('../../packages/script/src/runtime/server/utils/network-host', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../packages/script/src/runtime/server/utils/network-host')>()
  return {
    ...actual,
    createPublicNetworkDispatcher: async () => ({
      fetch: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
      close: async () => {},
    }),
  }
})

describe('proxy handler request bodies (#836)', () => {
  let upstreamServer: Server
  let proxyServer: Server
  let upstreamPort: number
  let proxyPort: number
  let capturedBody = Buffer.alloc(0)
  let capturedContentLength: string | undefined
  let capturedContentType: string | undefined
  let capturedMethod: string | undefined
  let capturedFetchBody: BodyInit | null | undefined
  let capturedFetchDuplex: 'half' | undefined
  let capturedUrl = ''
  let capturedRequests: { method: string, url: string, headers: Record<string, string> }[] = []
  let releaseStream: (() => void) | undefined
  const realFetch = globalThis.fetch

  beforeAll(async () => {
    const upstreamApp = createApp()
    upstreamApp.use('/', defineEventHandler(async (event) => {
      capturedUrl = getRequestURL(event).pathname + getRequestURL(event).search
      capturedRequests.push({ method: event.method, url: capturedUrl, headers: Object.fromEntries(event.headers) })
      if (getRequestURL(event).pathname === '/redirect')
        return sendRedirect(event, '/redirected', 302)
      if (getRequestURL(event).pathname === '/redirect-post')
        return sendRedirect(event, '/final', 302)
      if (getRequestURL(event).pathname === '/redirect-307')
        return sendRedirect(event, '/final', 307)
      if (getRequestURL(event).pathname === '/redirect-300') {
        setResponseStatus(event, 300)
        setHeader(event, 'Location', '/final')
        return null
      }
      if (getRequestURL(event).pathname === '/redirect-cross-host')
        return sendRedirect(event, 'https://redirect.test/final', 302)
      if (getRequestURL(event).pathname === '/redirect-unallowed-host')
        return sendRedirect(event, 'https://evil.test/steal', 302)
      if (getRequestURL(event).pathname === '/redirect-local-host')
        return sendRedirect(event, 'http://localhost/steal', 302)
      if (getRequestURL(event).pathname === '/redirect-no-location') {
        setResponseStatus(event, 302)
        return null
      }
      if (getRequestURL(event).pathname === '/redirect-loop')
        return sendRedirect(event, '/redirect-loop', 302)
      if (getRequestURL(event).pathname === '/response-hop-headers') {
        setHeader(event, 'Connection', 'x-upstream-hop')
        setHeader(event, 'Clear-Site-Data', '"*"')
        setHeader(event, 'Strict-Transport-Security', 'max-age=0')
        setHeader(event, 'X-Upstream-Hop', 'must-not-forward')
        setHeader(event, 'X-End-To-End', 'forward-me')
      }
      if (getRequestURL(event).pathname === '/stream') {
        event.node.res.writeHead(200, { 'content-type': 'text/plain' })
        event.node.res.write('first')
        await new Promise<void>((resolve) => {
          releaseStream = resolve
        })
        event.node.res.end('second')
        return
      }
      const rawBody = event.method === 'GET' ? undefined : await readRawBody(event, false)
      capturedBody = rawBody ? Buffer.from(rawBody) : Buffer.alloc(0)
      capturedContentLength = event.headers.get('content-length') ?? undefined
      capturedContentType = event.headers.get('content-type') ?? undefined
      capturedMethod = event.method
      return { status: 1 }
    }))

    upstreamServer = createServer(toNodeListener(upstreamApp))
    await new Promise<void>(resolve => upstreamServer.listen(0, resolve))
    upstreamPort = (upstreamServer.address() as { port: number }).port

    globalThis.fetch = (input, init) => {
      const requestUrl = input instanceof Request ? input.url : String(input)
      const url = new URL(requestUrl)
      if (url.hostname === 'upstream.test' || url.hostname === 'redirect.test') {
        capturedFetchBody = init?.body
        capturedFetchDuplex = (init as RequestInit & { duplex?: 'half' } | undefined)?.duplex
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
    capturedMethod = undefined
    capturedFetchBody = undefined
    capturedFetchDuplex = undefined
    capturedUrl = ''
    capturedRequests = []
    releaseStream = undefined
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
    expect(capturedFetchBody).toBeInstanceOf(Uint8Array)
    expect(capturedFetchDuplex).toBeUndefined()
    expect(Buffer.from(capturedFetchBody as Uint8Array).equals(compressed)).toBe(true)
    expect(capturedBody.equals(compressed)).toBe(true)
    expect(capturedContentType).toBe('text/plain')
  })

  it('forwards an explicitly empty opaque POST without a body stream (#853)', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/measurement/conversion`, {
      method: 'POST',
      headers: {
        'content-length': '0',
        'content-type': 'text/plain;charset=UTF-8',
      },
    })

    expect(response.status).toBe(200)
    expect(capturedFetchBody).toBeUndefined()
    expect(capturedFetchDuplex).toBeUndefined()
    expect(capturedBody).toHaveLength(0)
    expect(capturedContentLength).toBe('0')
  })

  it('rejects an allowlisted local network target before the upstream fetch', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/127.0.0.1/private`)

    expect(response.status).toBe(403)
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

  it('preserves repeated query parameters while applying privacy transforms', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/collect?tag=a&tag=b&hardwareConcurrency=128`)

    expect(response.status).toBe(200)
    expect(capturedUrl).toBe('/collect?tag=a&tag=b&hardwareConcurrency=16')
  })

  it('follows a redirect and re-validates the hop against the allowlist (#885)', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/redirect-post`, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        'content-language': 'en',
        'content-location': 'https://example.com/track',
      },
      body: 'track=1',
    })

    expect(response.status).toBe(200)
    expect(capturedUrl).toBe('/final')
    // A 302 replays as GET without a body, the same as a browser fetch would.
    expect(capturedMethod).toBe('GET')
    expect(capturedBody).toHaveLength(0)
    // The fetch spec drops every request-body header with the body.
    const replayHeaders = capturedRequests.at(-1)!.headers
    for (const header of ['content-type', 'content-encoding', 'content-language', 'content-length', 'content-location'])
      expect(replayHeaders).not.toHaveProperty(header)
  })

  it('replays the buffered body when a 307 preserves the method', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/redirect-307`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'track=1',
    })

    expect(response.status).toBe(200)
    expect(capturedUrl).toBe('/final')
    expect(capturedMethod).toBe('POST')
    expect(capturedBody.toString()).toBe('track=1')
    expect(capturedContentLength).toBe('7')
  })

  it('passes a 300 through unchanged instead of replaying the request', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/redirect-300`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'track=1',
    })

    // 300 is not a fetch redirect status, so a browser fetch would surface it as-is.
    expect(response.status).toBe(300)
    expect(capturedRequests.map(request => request.url)).toEqual(['/redirect-300'])
  })

  it('follows an absolute redirect to another allowlisted host', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/redirect-cross-host`)

    expect(response.status).toBe(200)
    expect(capturedUrl).toBe('/final')
  })

  it('rejects a redirect to a host outside the allowlist', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/redirect-unallowed-host`)

    expect(response.status).toBe(502)
    expect(response.statusText).toBe('Unsafe upstream redirect')
    expect(capturedRequests.map(request => request.url)).toEqual(['/redirect-unallowed-host'])
  })

  it('rejects a redirect to a local network host', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/redirect-local-host`)

    expect(response.status).toBe(502)
    expect(response.statusText).toBe('Unsafe upstream redirect')
  })

  it('rejects a redirect without a Location header', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/redirect-no-location`)

    expect(response.status).toBe(502)
  })

  it('rejects a redirect chain that exceeds the limit', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/redirect-loop`)

    expect(response.status).toBe(502)
    expect(response.statusText).toBe('Too many upstream redirects')
    // The initial request plus five followed hops; the sixth redirect is refused.
    expect(capturedRequests).toHaveLength(6)
  })

  it('strips response headers named by the upstream Connection header', async () => {
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/response-hop-headers`)

    expect(response.status).toBe(200)
    expect(response.headers.get('x-upstream-hop')).toBeNull()
    expect(response.headers.get('clear-site-data')).toBeNull()
    expect(response.headers.get('strict-transport-security')).toBeNull()
    expect(response.headers.get('x-end-to-end')).toBe('forward-me')
    expect(response.headers.get('content-security-policy')).toBe('sandbox; default-src \'none\'; base-uri \'none\'; form-action \'none\'')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('starts the downstream response before the upstream body completes', async () => {
    const responsePromise = realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/stream`)
    const receivedHeadersBeforeCompletion = await Promise.race([
      responsePromise.then(() => true),
      new Promise<false>(resolve => setTimeout(resolve, 100, false)),
    ])

    releaseStream?.()
    const response = await responsePromise

    expect(receivedHeadersBeforeCompletion).toBe(true)
    expect(await response.text()).toBe('firstsecond')
  })

  it('does not apply the connection timeout after upstream headers arrive', async () => {
    const realSetTimeout = globalThis.setTimeout
    let connectionTimeout: ReturnType<typeof setTimeout> | undefined
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback, delay, ...args) => {
      const timeout = realSetTimeout(callback, delay, ...args)
      if (delay === 15000 && connectionTimeout === undefined)
        connectionTimeout = timeout
      return timeout
    }) as typeof setTimeout)
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    try {
      const response = await realFetch(`http://127.0.0.1:${proxyPort}/_scripts/p/upstream.test/stream`)
      expect(connectionTimeout).toBeDefined()
      expect(clearTimeoutSpy).toHaveBeenCalledWith(connectionTimeout)
      releaseStream?.()

      expect(await response.text()).toBe('firstsecond')
    }
    finally {
      clearTimeoutSpy.mockRestore()
      timeoutSpy.mockRestore()
      releaseStream?.()
    }
  })

  it('cancels an upstream response body that stops producing chunks', async () => {
    vi.useFakeTimers()
    const cancel = vi.fn()
    const abort = vi.fn()
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('first'))
      },
      cancel,
    })
    const reader = withResponseBodyIdleTimeout(source, 15000, abort).getReader()

    try {
      expect(new TextDecoder().decode((await reader.read()).value)).toBe('first')
      const timedOutRead = expect(reader.read()).rejects.toThrow('Upstream response body timed out')

      await vi.advanceTimersByTimeAsync(15000)

      await timedOutRead
      expect(abort).toHaveBeenCalledOnce()
      expect(cancel).toHaveBeenCalledOnce()
    }
    finally {
      vi.useRealTimers()
    }
  })
})
