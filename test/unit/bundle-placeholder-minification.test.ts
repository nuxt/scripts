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

async function deferAndMinify(options?: Partial<AssetBundlerTransformerOptions>, graph: Record<string, never> | undefined = undefined) {
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

  const getModuleInfo = (id: string) => (graph?.[id] ? { importers: [], dynamicImporters: [] } : undefined)
  const bundle = { 'entry.js': { type: 'chunk', code: minified } as any }
  await plugin.generateBundle.call({ getModuleInfo }, {}, bundle)
  return bundle['entry.js'].code as string
}

describe('integrity placeholders under minified rendering', () => {
  it('unused component leaves no integrity token or crossorigin in the chunk', async () => {
    const code = await deferAndMinify()

    expect(code).toContain(REMOTE_SRC)
    expect(code).not.toContain('__NUXT_SCRIPT_INTEGRITY_')
    expect(code).not.toContain('crossorigin')
  })

  it('fallback bundle leaves no integrity token or crossorigin in the chunk', async () => {
    const imported = await deferAndMinify(undefined, { [COMPONENT_ID]: {} })

    expect(imported).toContain(REMOTE_SRC)
    expect(imported).not.toContain('__NUXT_SCRIPT_INTEGRITY_')
    expect(imported).not.toContain('crossorigin')
  })
})
