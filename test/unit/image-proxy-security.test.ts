import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('#nuxt-scripts/nitro', () => ({
  defineCachedFunction: (handler: (...args: any[]) => any) => handler,
  useRuntimeConfig: () => ({}),
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

const { createImageProxyHandler } = await import('../../packages/script/src/runtime/server/utils/image-proxy')

describe('image proxy security', () => {
  let upstreamServer: Server
  let proxyServer: Server
  let manualProxyServer: Server
  let upstreamPort: number
  let proxyPort: number
  let manualProxyPort: number
  let disallowedServer: Server
  let disallowedPort: number
  let disallowedRequests = 0
  const realFetch = globalThis.fetch

  beforeAll(async () => {
    disallowedServer = createServer((_req, res) => {
      disallowedRequests++
      res.writeHead(200, { 'content-type': 'image/png' })
      res.end('private')
    })
    await new Promise<void>(resolve => disallowedServer.listen(0, '127.0.0.1', resolve))
    disallowedPort = (disallowedServer.address() as { port: number }).port

    upstreamServer = createServer((req, res) => {
      if (req.url === '/same-host-redirect') {
        res.writeHead(302, { location: '/image' })
        res.end()
        return
      }
      if (req.url === '/cross-host-redirect') {
        res.writeHead(302, { location: `http://evil.example.com:${disallowedPort}/private` })
        res.end()
        return
      }
      if (req.url === '/html') {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end('<script>globalThis.compromised = true</script>')
        return
      }
      if (req.url === '/missing') {
        res.writeHead(404, { 'content-type': 'image/png' })
        res.end('missing')
        return
      }
      res.writeHead(200, { 'content-type': 'image/png' })
      res.end('image')
    })
    await new Promise<void>(resolve => upstreamServer.listen(0, '127.0.0.1', resolve))
    upstreamPort = (upstreamServer.address() as { port: number }).port

    globalThis.fetch = (input, init) => {
      const requestUrl = input instanceof Request ? input.url : String(input)
      const url = new URL(requestUrl)
      if (url.hostname === 'cdn.example.com')
        return realFetch(`http://127.0.0.1:${upstreamPort}${url.pathname}${url.search}`, init)
      if (url.hostname === 'evil.example.com')
        return realFetch(`http://127.0.0.1:${disallowedPort}${url.pathname}${url.search}`, init)
      return realFetch(input, init)
    }

    const app = createApp()
    app.use(createImageProxyHandler({ allowedDomains: ['cdn.example.com'] }))
    proxyServer = createServer(toNodeListener(app))
    await new Promise<void>(resolve => proxyServer.listen(0, '127.0.0.1', resolve))
    proxyPort = (proxyServer.address() as { port: number }).port

    const manualApp = createApp()
    manualApp.use(createImageProxyHandler({
      allowedDomains: ['cdn.example.com'],
      followRedirects: false,
    }))
    manualProxyServer = createServer(toNodeListener(manualApp))
    await new Promise<void>(resolve => manualProxyServer.listen(0, '127.0.0.1', resolve))
    manualProxyPort = (manualProxyServer.address() as { port: number }).port
  })

  afterAll(async () => {
    globalThis.fetch = realFetch
    await Promise.all([
      new Promise<void>(resolve => upstreamServer.close(() => resolve())),
      new Promise<void>(resolve => proxyServer.close(() => resolve())),
      new Promise<void>(resolve => manualProxyServer.close(() => resolve())),
      new Promise<void>(resolve => disallowedServer.close(() => resolve())),
    ])
  })

  function proxyUrl(path: string): string {
    const target = `http://cdn.example.com${path}`
    return `http://127.0.0.1:${proxyPort}/?url=${encodeURIComponent(target)}`
  }

  it('follows redirects only while every target remains allowlisted', async () => {
    const response = await fetch(proxyUrl('/same-host-redirect'))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('image')
  })

  it('rejects a redirect to a hostname outside the allowlist before fetching it', async () => {
    const response = await fetch(proxyUrl('/cross-host-redirect'))

    expect(response.status).toBe(403)
    expect(disallowedRequests).toBe(0)
  })

  it('rejects a direct local network target before fetching it', async () => {
    const target = `http://127.0.0.1:${disallowedPort}/private`
    const response = await realFetch(`http://127.0.0.1:${proxyPort}/?url=${encodeURIComponent(target)}`)

    expect(response.status).toBe(403)
    expect(disallowedRequests).toBe(0)
  })

  it('rejects active upstream content from an image route', async () => {
    const response = await fetch(proxyUrl('/html'))

    expect(response.status).toBe(415)
  })

  it('preserves upstream errors when redirects are disabled', async () => {
    const target = 'http://cdn.example.com/missing'
    const response = await fetch(`http://127.0.0.1:${manualProxyPort}/?url=${encodeURIComponent(target)}`)

    expect(response.status).toBe(404)
  })
})
