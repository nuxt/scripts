/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const setWorkerUrl = vi.fn()

vi.mock('nuxt/app', () => ({
  createError: (input: { message: string }) => new Error(input.message),
  useRuntimeConfig: () => ({ public: { scripts: {} } }),
}))

vi.mock('../../packages/script/src/runtime/composables/useScript', () => ({
  useScript: vi.fn((input, options) => ({ input, options })),
}))

vi.mock('maplibre-gl', () => ({ setWorkerUrl, Map: class {} }))

async function loadMapLibre(options?: Record<string, unknown>) {
  const { useScriptMapLibre } = await import('../../packages/script/src/runtime/registry/maplibre')
  const { useScript } = await import('../../packages/script/src/runtime/composables/useScript')

  useScriptMapLibre(options as never)

  const input = vi.mocked(useScript).mock.calls.at(-1)?.[0] as {
    key: string
    loader: (ctx: { signal: AbortSignal }) => Promise<unknown>
  }
  return { input, api: await input.loader({ signal: new AbortController().signal }) }
}

describe('useScriptMapLibre', () => {
  let injectedStyles: HTMLLinkElement[] = []

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    delete window.maplibregl
    injectedStyles = []
    // Capture the stylesheet without connecting it, so happy-dom does not fetch it.
    vi.spyOn(document.head, 'append').mockImplementation((node) => {
      injectedStyles.push(node as HTMLLinkElement)
    })
  })

  it('loads MapLibre from the package instead of a script tag', async () => {
    const { input, api } = await loadMapLibre({ injectStyles: false })

    expect(input).not.toHaveProperty('src')
    expect(input.key).toBe('maplibre')
    expect(api).toMatchObject({ maplibregl: window.maplibregl })
    expect(window.maplibregl?.Map).toBeTypeOf('function')
  })

  it('injects a custom stylesheet when one is configured', async () => {
    await loadMapLibre({ stylesheetUrl: 'https://cdn.example.com/maplibre.css' })

    expect(injectedStyles.map(link => link.href)).toEqual(['https://cdn.example.com/maplibre.css'])
  })

  it('does not inject a stylesheet when injectStyles is disabled', async () => {
    await loadMapLibre({ injectStyles: false, stylesheetUrl: 'https://cdn.example.com/maplibre.css' })

    expect(injectedStyles).toHaveLength(0)
  })

  it('points MapLibre at the bundled worker by default', async () => {
    await loadMapLibre({ injectStyles: false })

    expect(setWorkerUrl).toHaveBeenCalledOnce()
    expect(setWorkerUrl.mock.calls[0]?.[0]).toContain('maplibre-gl-worker')
  })

  it('applies a custom worker URL', async () => {
    await loadMapLibre({ injectStyles: false, workerUrl: '/maplibre-worker.js' })

    expect(setWorkerUrl).toHaveBeenCalledWith('/maplibre-worker.js')
  })

  it('aborts before touching the package when the signal is already aborted', async () => {
    const { useScriptMapLibre } = await import('../../packages/script/src/runtime/registry/maplibre')
    const { useScript } = await import('../../packages/script/src/runtime/composables/useScript')

    useScriptMapLibre({ injectStyles: false } as never)
    const { loader } = vi.mocked(useScript).mock.calls.at(-1)?.[0] as {
      loader: (ctx: { signal: AbortSignal }) => Promise<unknown>
    }

    const controller = new AbortController()
    controller.abort()

    await expect(loader({ signal: controller.signal })).rejects.toThrow()
    expect(window.maplibregl).toBeUndefined()
  })
})
