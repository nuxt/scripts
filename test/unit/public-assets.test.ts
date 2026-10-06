import { afterEach, describe, expect, it, vi } from 'vitest'
import { setupPublicAssetStrategy } from '../../packages/script/src/assets'

const { addDevServerHandler } = vi.hoisted(() => ({ addDevServerHandler: vi.fn() }))

vi.mock('../../packages/script/node_modules/@nuxt/kit', () => ({
  addDevServerHandler,
  extendRouteRules: vi.fn(),
  tryUseNuxt: () => undefined,
  useNuxt: () => ({ options: { dev: true, buildDir: '/tmp/nuxt-scripts-assets' }, hook: vi.fn() }),
}))

describe('public script assets', () => {
  afterEach(() => {
    addDevServerHandler.mockClear()
  })

  it('serves bundled bytes as a JavaScript Web response', async () => {
    const { renderedScript } = setupPublicAssetStrategy('/_scripts/assets')
    const content = Buffer.from('window.bundled = "✓"')
    renderedScript.set('/_scripts/assets/example.js', { content, size: 1, src: 'https://example.com/sdk.js' })
    const { handler } = addDevServerHandler.mock.calls[0]![0]
    const response = await handler({ path: '/example.js?cache=1' })

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/javascript; charset=utf-8')
    expect(Buffer.from(await response.arrayBuffer())).toEqual(content)
    renderedScript.clear()
  })

  it('returns 404 for an unknown script', async () => {
    const { renderedScript } = setupPublicAssetStrategy('/_scripts/assets')
    renderedScript.clear()
    const { handler } = addDevServerHandler.mock.calls[0]![0]
    const response = await handler({ path: '/missing.js' })

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(404)
  })
})
