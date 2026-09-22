// Regression coverage for integrity placeholders surviving production minification:
// rolldown/oxc renders every string literal as a template literal, so any removal
// keyed on exact unminified source text can never match and the unresolved
// `__NUXT_SCRIPT_INTEGRITY_*__` token ships to browser chunks.
import type { AssetBundlerTransformerOptions } from '../../packages/script/src/plugins/transform'
import { describe, expect, it, vi } from 'vitest'
import { NuxtScriptBundleTransformer } from '../../packages/script/src/plugins/transform'

vi.mock('../../packages/script/src/assets', () => ({
  bundleStorage: vi.fn(() => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    getItemRaw: vi.fn(),
    setItemRaw: vi.fn(),
    hasItem: vi.fn().mockResolvedValue(false),
  })),
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const COMPONENT_ID = '/app/node_modules/@nuxt/scripts/dist/runtime/components/BuyWidget.vue'
const COMPONENT_DIR = '/app/node_modules/@nuxt/scripts/dist/runtime/components'
const REMOTE_SRC = 'https://example.com/widget.js'
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

async function deferAndMinify(options?: Partial<AssetBundlerTransformerOptions>, importers: string[] = []) {
  const code = `const instance = useScript('${REMOTE_SRC}', { bundle: true })`
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

  // Simulate the oxc minifier shape observed in real emitted chunks: whitespace
  // squeezed out and every string literal re-quoted with backticks.
  const minified = transformed.code.replace(/\s+/g, '').replace(/'/g, '`')

  const ctx = { getModuleInfo: (id: string) => (id === COMPONENT_ID ? { importers, dynamicImporters: [] } : { importers: [], dynamicImporters: [] }) }
  await plugin.renderStart.call(ctx, {}, {})
  const result = await plugin.renderChunk.call(ctx, minified, { fileName: 'entry.js' }, { sourcemap: false })
  return (result?.code ?? minified) as string
}

describe('integrity placeholders under minified rendering', () => {
  it('unused component leaves no integrity token or crossorigin in the chunk', async () => {
    const code = await deferAndMinify()

    expect(code).toContain(REMOTE_SRC)
    expect(code).not.toContain('__NUXT_SCRIPT_INTEGRITY_')
    expect(code).not.toContain('crossorigin')
  })

  it('used component whose download fails falls back to the remote src without crossorigin', async () => {
    // A used component takes the download path; the failed fetch resolves no integrity
    // hash, so the whole integrity + crossorigin span has to go.
    fetchMock.mockRejectedValue(new Error('network down'))
    const imported = await deferAndMinify(undefined, [APP_IMPORTER])

    expect(fetchMock, 'the used component must attempt its download').toHaveBeenCalled()
    expect(imported).toContain(REMOTE_SRC)
    expect(imported).not.toContain('__NUXT_SCRIPT_INTEGRITY_')
    expect(imported).not.toContain('crossorigin')
  })
})
