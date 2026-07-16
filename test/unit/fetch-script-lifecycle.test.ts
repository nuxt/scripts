import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchScript } from '../../packages/devtools-app/utils/fetch'

describe('devtools script-size fetch lifecycle', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns body-stream failures instead of rejecting', async () => {
    const error = new Error('response body aborted')
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(error)
      },
    })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(body, {
      headers: { 'Content-Type': 'application/javascript' },
    }))))

    await expect(fetchScript('https://example.com/script.js')).resolves.toEqual({
      size: null,
      error,
    })
  })
})
