// Regression: deferred component bundle downloads must overlap while they resolve
// during output generation. A sequential `for...of` + `await` makes the build
// wall-clock time the sum of every used component's script latency instead of the
// slowest one.
import type { AssetBundlerTransformerOptions } from '../../packages/script/src/plugins/transform'
import { describe, expect, it, vi } from 'vitest'
import { NuxtScriptBundleTransformer } from '../../packages/script/src/plugins/transform'

const mockBundleStorage: any = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  getItemRaw: vi.fn(),
  setItemRaw: vi.fn(),
  hasItem: vi.fn(),
}
vi.mock('../../packages/script/src/assets', () => ({
  bundleStorage: vi.fn(() => mockBundleStorage),
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const COMPONENT_DIR = '/app/components'
const APP_IMPORTER = '/app/pages/index.vue'

function makeNuxt() {
  return {
    options: {
      dev: false,
      builder: '@nuxt/vite-builder',
      buildDir: '.nuxt',
      app: { baseURL: '/' },
      runtimeConfig: { app: {} },
    },
    hooks: { hook: vi.fn() },
  } as any
}

function makePlugin(options: Partial<AssetBundlerTransformerOptions> = {}) {
  mockBundleStorage.hasItem.mockResolvedValue(false)
  return NuxtScriptBundleTransformer({
    renderedScript: new Map(),
    integrity: true,
    fallbackOnSrcOnBundleFail: true,
    componentDir: COMPONENT_DIR,
    ...options,
    nuxt: makeNuxt(),
  }).vite() as any
}

async function registerComponent(plugin: any, file: string, src: string) {
  const code = `const instance = useScript('${src}', { bundle: true })`
  const id = `${COMPONENT_DIR}/${file}?vue&type=script&setup=true&lang.ts`
  const transformed = await plugin.transform.handler.call({}, code, id)
  expect(transformed?.code).toBeTruthy()
  return transformed.code
}

/**
 * Run the deferred pipeline the way the bundler does at emit time: an awaited hook
 * with the final module graph, then patches applied to every emitted chunk.
 */
async function emitChunks(plugin: any, codes: Record<string, string>) {
  const getModuleInfo = () => ({ importers: [APP_IMPORTER], dynamicImporters: [] })
  const bundle = Object.fromEntries(
    Object.entries(codes).map(([name, code]) => [name, { type: 'chunk', code } as any]),
  )
  await plugin.generateBundle.call({ getModuleInfo }, {}, bundle)
  return bundle as Record<string, { type: 'chunk', code: string }>
}

describe('deferred component downloads stay concurrent', () => {
  it('starts every used-component download before the first one resolves', async () => {
    const calls: string[] = []
    const gates: Array<() => void> = []
    fetchMock.mockImplementation((url: string) => {
      calls.push(url)
      let openGate!: () => void
      const gate = new Promise<void>((resolve) => {
        openGate = resolve
      })
      gates.push(openGate)
      // The download stays in flight until we release its gate.
      return gate.then(() => ({
        ok: true,
        headers: { get: () => null },
        _data: Buffer.from(`/* ${url} */`),
      }))
    })

    const plugin = makePlugin()
    await registerComponent(plugin, 'Alpha.vue', 'https://example.com/alpha.js')
    await registerComponent(plugin, 'Beta.vue', 'https://example.com/beta.js')

    const running = plugin.generateBundle.call({
      getModuleInfo: () => ({ importers: [APP_IMPORTER], dynamicImporters: [] }),
    }, {}, {})
    expect(running).toBeInstanceOf(Promise)

    // First download started; the response is still pending.
    await vi.waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(1))
    // Sequential execution can never reach the second download while the
    // first response is parked, so give it ample microtask/scheduler turns.
    await new Promise(resolve => setTimeout(resolve, 20))

    expect(calls).toEqual([
      'https://example.com/alpha.js',
      'https://example.com/beta.js',
    ])

    gates.forEach(gate => gate())
    await running
  })

  it('still renders both bundles correctly after overlapping downloads', async () => {
    fetchMock.mockImplementation((url: string) => Promise.resolve({
      ok: true,
      headers: { get: () => null },
      _data: Buffer.from(`/* ${url} */`),
    }))

    const plugin = makePlugin()
    const codeA = await registerComponent(plugin, 'Alpha.vue', 'https://example.com/alpha.js')
    const codeB = await registerComponent(plugin, 'Beta.vue', 'https://example.com/beta.js')

    const bundle = await emitChunks(plugin, { 'chunk-alpha.js': codeA, 'chunk-beta.js': codeB })

    for (const fileName of ['chunk-alpha.js', 'chunk-beta.js'] as const) {
      const code = bundle[fileName]!.code
      expect(code).toMatch(/\/_scripts\/assets\/[a-f0-9]{16}\.js/)
      expect(code).not.toContain('__NUXT_SCRIPT_BUNDLE_')
      expect(code).not.toContain('https://example.com')
    }
  })

  it('fatal download failure still rejects generateBundle when fallback is disabled', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('broken')) {
        return Promise.resolve({ ok: false, status: 500, headers: { get: () => null }, _data: undefined, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) })
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => null },
        _data: Buffer.from(`/* ${url} */`),
      })
    })

    const plugin = makePlugin({ fallbackOnSrcOnBundleFail: false })
    await registerComponent(plugin, 'Good.vue', 'https://example.com/good.js')
    await registerComponent(plugin, 'Broken.vue', 'https://example.com/broken.js')

    await expect(plugin.generateBundle.call({
      getModuleInfo: () => ({ importers: [APP_IMPORTER], dynamicImporters: [] }),
    }, {}, {})).rejects.toThrow(/broken\.js/)
  })
})
