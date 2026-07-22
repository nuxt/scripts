import type { Server } from 'node:http'
import { createServer } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('nitropack/runtime', () => ({
  defineCachedFunction: (handler: (...args: any[]) => any) => handler,
  useRuntimeConfig: () => ({}),
}))

const { createImageProxyHandler } = await import('../../packages/script/src/runtime/server/utils/image-proxy')

describe('image proxy security', () => {
  let upstreamServer: Server
  let proxyServer: Server
  let upstreamPort: number
  let proxyPort: number
  let disallowedServer: Server
  let disallowedPort: number
  let disallowedRequests = 0

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
        res.writeHead(302, { location: `http://localhost:${disallowedPort}/private` })
        res.end()
        return
      }
      if (req.url === '/html') {
        res.writeHead(200, { 'content-type': 'text/html' })
        res.end('<script>globalThis.compromised = true</script>')
        return
      }
      res.writeHead(200, { 'content-type': 'image/png' })
      res.end('image')
    })
    await new Promise<void>(resolve => upstreamServer.listen(0, '127.0.0.1', resolve))
    upstreamPort = (upstreamServer.address() as { port: number }).port

    const app = createApp()
    app.use(createImageProxyHandler({ allowedDomains: ['127.0.0.1'] }))
    proxyServer = createServer(toNodeListener(app))
    await new Promise<void>(resolve => proxyServer.listen(0, '127.0.0.1', resolve))
    proxyPort = (proxyServer.address() as { port: number }).port
  })

  afterAll(async () => {
    await Promise.all([
      new Promise<void>(resolve => upstreamServer.close(() => resolve())),
      new Promise<void>(resolve => proxyServer.close(() => resolve())),
      new Promise<void>(resolve => disallowedServer.close(() => resolve())),
    ])
  })

  function proxyUrl(path: string): string {
    const target = `http://127.0.0.1:${upstreamPort}${path}`
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

  it('rejects active upstream content from an image route', async () => {
    const response = await fetch(proxyUrl('/html'))

    expect(response.status).toBe(415)
  })
})
