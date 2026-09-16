import type { AddressInfo } from 'node:net'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Miniflare } from 'miniflare'
import { transformWithOxc } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * The platform dispatcher backs every non-Node Nitro preset, including
 * cloudflare-module. Node's fetch tolerates any `this`, but workerd's native
 * fetch throws `TypeError: Illegal invocation` when a detached reference is
 * called as a method, so this behaviour can only be verified inside workerd.
 */

const dispatcherDir = dirname(fileURLToPath(import.meta.url))
const dispatcherPath = join(dispatcherDir, '../../packages/script/src/runtime/server/utils/network-dispatcher.platform.ts')

const upstreamBodies: string[] = []
const server = createServer((req, res) => {
  const chunks: Buffer[] = []
  req.on('data', chunk => chunks.push(chunk))
  req.on('end', () => {
    upstreamBodies.push(Buffer.concat(chunks).toString())
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, path: req.url }))
  })
})

/** Worker source exercising the dispatcher the way proxy-handler.ts calls it. */
async function buildWorkerScript(port: number): Promise<string> {
  const { code } = await transformWithOxc(await readFile(dispatcherPath, 'utf8'), dispatcherPath)
  return `${code}
export default {
  async fetch(request) {
    const network = await createNetworkDispatcher()
    try {
      const url = new URL(request.url)
      const target = 'http://127.0.0.1:${port}' + url.pathname + url.search
      const body = url.searchParams.has('stream')
        ? request.body
        : url.searchParams.has('body')
          ? await request.text()
          : undefined
      // Called as a method on the dispatcher object — the detached reference
      // is what workerd rejects when the fetch is not receiver-safe.
      const response = await network.fetch(target, {
        method: url.searchParams.has('body') || url.searchParams.has('stream') ? 'POST' : 'GET',
        headers: { 'content-type': 'text/plain;charset=UTF-8' },
        body,
        credentials: 'omit',
        signal: AbortSignal.timeout(5000),
        redirect: 'manual',
        duplex: body instanceof ReadableStream ? 'half' : undefined,
      })
      return Response.json({ ok: true, status: response.status, body: await response.text() })
    }
    catch (error) {
      return Response.json({ ok: false, name: error?.name, message: error?.message })
    }
    finally {
      await network.close()
    }
  },
}
`
}

let mf: Miniflare | undefined

beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  mf = new Miniflare({
    workers: [{
      modules: true,
      script: await buildWorkerScript(port),
    }],
  })
})

afterAll(async () => {
  await mf?.dispose()
  await new Promise<void>(resolve => server.close(() => resolve()))
})

describe('platform network dispatcher in workerd (#889)', () => {
  it('survives being called as a method on the dispatcher object', async () => {
    const response = await mf!.dispatchFetch('http://localhost/api/send')
    expect(await response.json()).toMatchObject({ ok: true, status: 200 })
  })

  it('forwards a streamed POST body through the method call', async () => {
    upstreamBodies.length = 0
    const payload = JSON.stringify({ website: 'abc', url: 'https://example.com/' })
    const response = await mf!.dispatchFetch('http://localhost/api/send?stream', {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: payload,
    })
    expect(await response.json()).toMatchObject({ ok: true, status: 200 })
    expect(upstreamBodies[0]).toBe(payload)
  })

  it('forwards a string POST body through the method call', async () => {
    upstreamBodies.length = 0
    const response = await mf!.dispatchFetch('http://localhost/api/send?body', {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: 'hello=1',
    })
    expect(await response.json()).toMatchObject({ ok: true, status: 200 })
    expect(upstreamBodies[0]).toBe('hello=1')
  })
})
