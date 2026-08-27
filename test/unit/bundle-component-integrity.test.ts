// Reproduction for the deferred component bundling integrity finding:
// when a bundled script falls back to its remote src (or no hash resolves),
// the rewrite must not leave `integrity: ''` paired with
// `crossorigin: 'anonymous'`, which silently forces CORS request mode.
import type { AssetBundlerTransformerOptions } from '../../packages/script/src/plugins/transform'
import { createHash } from 'node:crypto'
import { hash } from 'ohash'
import { hasProtocol } from 'ufo'
import { describe, expect, it, vi } from 'vitest'
import { NuxtScriptBundleTransformer } from '../../packages/script/src/plugins/transform'

vi.mock('ohash', async (og) => {
  const mod = await og<typeof import('ohash')>()
  return { ...mod, hash: vi.fn(mod.hash) }
})
vi.mock('ufo', async (og) => {
  const mod = await og<typeof import('ufo')>()
  return { ...mod, hasProtocol: vi.fn(mod.hasProtocol) }
})

vi.mocked(hasProtocol).mockImplementation(() => true)
vi.mocked(hash).mockImplementation(src => String((src as any).pathname ?? src))

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

const COMPONENT_ID = '/app/components/BuyWidget.vue'
const COMPONENT_DIR = '/app/components'
// An importer path must exit the runtime components dir for the component to count as used.
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

async function buildComponentChunk(options: Partial<AssetBundlerTransformerOptions>, importers: string[]) {
  mockBundleStorage.hasItem.mockResolvedValue(false)
  const code = `const instance = useScript('https://example.com/widget.js', { bundle: true })`
  const plugin = NuxtScriptBundleTransformer({
    renderedScript: new Map(),
    integrity: true,
    fallbackOnSrcOnBundleFail: true,
    componentDir: COMPONENT_DIR,
    ...options,
    nuxt: makeNuxt(),
  }).vite() as any

  const transformed = await plugin.transform.handler.call({}, code, `${COMPONENT_ID}?vue&type=script&setup=true&lang.ts`)
  expect(transformed?.code).toBeTruthy()

  // Simulate rollup's final module graph before files are written.
  const getModuleInfo = () => ({ importers, dynamicImporters: [] })
  const bundle = { 'entry.js': { type: 'chunk', code: transformed.code } as any }
  await plugin.generateBundle.call({ getModuleInfo }, {}, bundle)
  return bundle['entry.js'].code as string
}

describe('deferred component bundling integrity placeholders', () => {
  it('bundle falls back to remote src -> no empty integrity and no crossorigin', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))
    const code = await buildComponentChunk({}, [APP_IMPORTER])

    expect(code).toContain('https://example.com/widget.js')
    expect(code).not.toContain(`crossorigin`)
    expect(code).not.toMatch(/integrity:\s*['"`]['"`]/)
  })

  it('unused component falls back to remote src -> no empty integrity and no crossorigin', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))
    const code = await buildComponentChunk({}, [])

    expect(code).toContain('https://example.com/widget.js')
    expect(code).not.toContain(`crossorigin`)
    expect(code).not.toMatch(/integrity:\s*['"`]['"`]/)
  })

  it('successful bundle keeps the real integrity hash with crossorigin', async () => {
    const body = Buffer.from('/* widget */ console.log("widget")')
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(body),
      headers: { get: () => null },
      _data: body,
    })
    const code = await buildComponentChunk({}, [APP_IMPORTER])

    const expected = `sha384-${createHash('sha384').update(body).digest('base64')}`
    expect(code).toMatch(/\/_scripts\/assets\/[a-f0-9]{16}\.js/)
    expect(code).toContain(`integrity: '${expected}'`)
    expect(code).toContain(`crossorigin: 'anonymous'`)
  })
})
