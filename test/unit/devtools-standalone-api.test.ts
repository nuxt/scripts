import type { EventEmitter } from 'node:events'
import { Buffer } from 'node:buffer'
import { PassThrough } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { setupStandaloneApi } from '../../packages/script/src/devtools'

type Middleware = (req: PassThrough & { method: string }, res: TestResponse) => void

interface TestResponse extends EventEmitter {
  statusCode: number
  setHeader: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
}

function createResponse(onEnd?: (body?: string) => void): TestResponse {
  return {
    statusCode: 0,
    setHeader: vi.fn(),
    end: vi.fn(onEnd),
  } as unknown as TestResponse
}

describe('standalone devtools state API', () => {
  it('decodes JSON after joining UTF-8 chunks', async () => {
    let serverCreated: ((server: any) => void) | undefined
    let middleware: Middleware | undefined
    setupStandaloneApi({
      hook(name: string, callback: (server: any) => void) {
        if (name === 'vite:serverCreated')
          serverCreated = callback
      },
    } as any)
    serverCreated?.({
      middlewares: {
        use(_route: string, handler: Middleware) {
          middleware = handler
        },
      },
    })

    const payload = Buffer.from(JSON.stringify({ scripts: { sdk: { label: 'A🌏B' } } }))
    const emojiOffset = payload.indexOf(Buffer.from('🌏'))
    const splitOffset = emojiOffset + 2
    const request = Object.assign(new PassThrough(), { method: 'POST' })
    const posted = new Promise<void>((resolve) => {
      middleware?.(request, createResponse(() => resolve()))
    })
    request.write(payload.subarray(0, splitOffset))
    request.end(payload.subarray(splitOffset))
    await posted

    let state = ''
    middleware?.(
      Object.assign(new PassThrough(), { method: 'GET' }),
      createResponse(body => state = body || ''),
    )

    expect(JSON.parse(state).scripts.sdk.label).toBe('A🌏B')
  })
})
