import type { AddressInfo } from 'node:net'
import type { PublicNetworkDispatcher, ResolveNetworkHostname } from '../../packages/script/src/runtime/server/utils/network-host'
import { createServer } from 'node:http'
import { gzipSync } from 'node:zlib'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createNetworkDispatcher } from '../../packages/script/src/runtime/server/utils/network-dispatcher.node'

let requests: Array<{ method: string, url: string, headers: Record<string, string | string[] | undefined>, body: string }> = []
let origin: string
const server = createServer((req, res) => {
  const chunks: Buffer[] = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    requests.push({
      method: req.method!,
      url: req.url!,
      headers: req.headers,
      body: Buffer.concat(chunks).toString(),
    })
    const path = req.url!
    if (path === '/gzip') {
      res.writeHead(200, { 'content-type': 'text/plain', 'content-encoding': 'gzip' })
      res.end(gzipSync(Buffer.from('compressed payload')))
      return
    }
    if (path === '/redirect') {
      res.writeHead(302, { location: 'https://example.com/elsewhere' })
      res.end()
      return
    }
    if (path === '/cookies') {
      res.writeHead(200, { 'set-cookie': ['a=1', 'b=2'] })
      res.end('ok')
      return
    }
    if (path === '/empty') {
      res.writeHead(204)
      res.end()
      return
    }
    res.writeHead(201, { 'content-type': 'application/json', 'x-echo': path })
    res.end(JSON.stringify({ received: Buffer.concat(chunks).toString() }))
  })
})

/** Resolve every hostname to the loopback test server, bypassing the public-address policy. */
function loopbackDispatcher(): Promise<PublicNetworkDispatcher> {
  return createNetworkDispatcher(() => ((_hostname: string, options: any, callback: any) => (
    options?.all
      ? callback(null, [{ address: '127.0.0.1', family: 4 }])
      : callback(null, '127.0.0.1', 4)
  )) as any)
}

/** A dispatcher whose lookup always rejects, standing in for the private-address policy. */
function rejectingDispatcher(): Promise<PublicNetworkDispatcher> {
  const failing: ResolveNetworkHostname = (_hostname, callback) =>
    callback(Object.assign(new Error('blocked'), { code: 'ERR_NUXT_SCRIPTS_PRIVATE_ADDRESS' }), [])
  return createNetworkDispatcher(
    resolve => ((_hostname: string, _options: any, callback: any) => resolve(_hostname, error => callback(error, ''))) as any,
    failing,
  )
}

let dispatcher: PublicNetworkDispatcher

beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = `http://cdn.example.com:${(server.address() as AddressInfo).port}`
  dispatcher = await loopbackDispatcher()
})

afterEach(() => {
  requests = []
})

afterAll(async () => {
  await dispatcher.close()
  await new Promise<void>(resolve => server.close(() => resolve()))
})

describe('node network dispatcher', () => {
  it('sends the request through the pinned lookup and returns the response', async () => {
    const response = await dispatcher.fetch(`${origin}/hello`)
    expect(response.status).toBe(201)
    expect(response.headers.get('x-echo')).toBe('/hello')
    expect(await response.json()).toEqual({ received: '' })
    expect(requests[0]!.headers.host).toBe(new URL(origin).host)
  })

  it('decompresses a gzip response body', async () => {
    const response = await dispatcher.fetch(`${origin}/gzip`)
    expect(await response.text()).toBe('compressed payload')
  })

  it('requests compressed encodings unless the caller set its own', async () => {
    await dispatcher.fetch(`${origin}/a`)
    expect(requests[0]!.headers['accept-encoding']).toBe('gzip, deflate, br')
    await dispatcher.fetch(`${origin}/b`, { headers: { 'accept-encoding': 'identity' } })
    expect(requests[1]!.headers['accept-encoding']).toBe('identity')
  })

  it('sends a string body with a content-length', async () => {
    await dispatcher.fetch(`${origin}/post`, { method: 'POST', body: 'hello=1' })
    expect(requests[0]!.method).toBe('POST')
    expect(requests[0]!.body).toBe('hello=1')
    expect(requests[0]!.headers['content-length']).toBe('7')
  })

  it('streams a ReadableStream body', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('chunk-one|'))
        controller.enqueue(new TextEncoder().encode('chunk-two'))
        controller.close()
      },
    })
    const response = await dispatcher.fetch(`${origin}/stream`, { method: 'POST', body, duplex: 'half' } as RequestInit)
    expect(await response.json()).toEqual({ received: 'chunk-one|chunk-two' })
    expect(requests[0]!.headers['content-length']).toBeUndefined()
  })

  it('does not follow redirects', async () => {
    const response = await dispatcher.fetch(`${origin}/redirect`)
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://example.com/elsewhere')
  })

  it('preserves repeated set-cookie headers', async () => {
    const response = await dispatcher.fetch(`${origin}/cookies`)
    expect(response.headers.getSetCookie()).toEqual(['a=1', 'b=2'])
  })

  it('returns a null body for a 204', async () => {
    const response = await dispatcher.fetch(`${origin}/empty`)
    expect(response.status).toBe(204)
    expect(response.body).toBeNull()
  })

  it('forwards a caller abort', async () => {
    const controller = new AbortController()
    const pending = dispatcher.fetch(`${origin}/slow`, { signal: controller.signal })
    controller.abort()
    await expect(pending).rejects.toThrow()
  })

  it('surfaces the lookup rejection so the private-address policy is detectable', async () => {
    const blocked = await rejectingDispatcher()
    await expect(blocked.fetch('http://blocked.example.com/')).rejects.toMatchObject({
      code: 'ERR_NUXT_SCRIPTS_PRIVATE_ADDRESS',
    })
    await blocked.close()
  })
})
