import type { IncomingMessage, ServerResponse } from 'node:http'
import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { setupStandaloneApi } from '../../packages/script/src/devtools'

function createRequest(method: string): IncomingMessage {
  return Object.assign(new EventEmitter(), {
    method,
    resume: vi.fn(),
  }) as IncomingMessage
}

function createResponse() {
  let body: unknown
  const response = {
    statusCode: 0,
    setHeader: vi.fn(),
    end: vi.fn((value?: unknown) => {
      body = value
    }),
  } as unknown as ServerResponse
  return { response, body: () => body }
}

describe('standalone devtools lifecycle', () => {
  it('decodes JSON after joining split UTF-8 chunks', async () => {
    const hooks = new Map<string, (...args: any[]) => any>()
    setupStandaloneApi({
      hook: vi.fn((name: string, callback: (...args: any[]) => any) => hooks.set(name, callback)),
    } as any)

    const use = vi.fn()
    hooks.get('vite:serverCreated')!({ middlewares: { use } })
    const handler = use.mock.calls[0]![1]

    const payload = Buffer.from(JSON.stringify({ scripts: { label: 'ready 😀' } }))
    const emojiOffset = payload.indexOf(Buffer.from('😀'))
    const postRequest = createRequest('POST')
    const postResponse = createResponse()
    handler(postRequest, postResponse.response)
    postRequest.emit('data', payload.subarray(0, emojiOffset + 1))
    postRequest.emit('data', payload.subarray(emojiOffset + 1))
    postRequest.emit('end')

    expect(postResponse.response.statusCode).toBe(200)

    const getResponse = createResponse()
    handler(createRequest('GET'), getResponse.response)
    expect(JSON.parse(String(getResponse.body())).scripts.label).toBe('ready 😀')
  })
})
