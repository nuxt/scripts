// Regression coverage for nested auto-registered widgets: a pending component whose
// importer chain never leaves the runtime components dir must not trigger any
// third-party download, even when its direct importer is another (unreferenced)
// component with importers of its own.
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

const COMPONENT_DIR = '/app/node_modules/@nuxt/scripts/dist/runtime/components'
const TRACKER_ID = `${COMPONENT_DIR}/Tracker.vue`
const PARENT_ID = `${COMPONENT_DIR}/UnusedParent.vue`
const CYCLE_SIBLING_ID = `${COMPONENT_DIR}/CycleSibling.vue`
const PAGE_ID = '/app/pages/index.vue'
const TRACKER_SRC = 'https://example.com/tracker.js'

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

async function deferScript(options?: Partial<AssetBundlerTransformerOptions>, id: string = TRACKER_ID) {
  const code = `const instance = useScript('${TRACKER_SRC}', { bundle: true })`
  const plugin = NuxtScriptBundleTransformer({
    renderedScript: new Map(),
    componentDir: COMPONENT_DIR,
    fallbackOnSrcOnBundleFail: true,
    ...options,
    nuxt: makeNuxt(),
  }).vite() as any

  const transformed = await plugin.transform.handler.call({}, code, `${id}?vue&type=script&setup=true&lang.ts`)
  expect(transformed?.code).toContain('__NUXT_SCRIPT_BUNDLE_')
  return { plugin, transformed }
}

/**
 * Drive the plugin through a production-like emit phase: module info comes from a
 * synthetic importer graph and patches apply to the emitted chunk code.
 */
async function emit(plugin: any, transformedCode: string, graph: Record<string, { importers?: string[], dynamicImporters?: string[] }>) {
  const getModuleInfo = (id: string) => {
    const queryIndex = id.indexOf('?')
    const cleanId = queryIndex === -1 ? id : id.slice(0, queryIndex)
    const entry = graph[cleanId]
    return entry ? { importers: entry.importers ?? [], dynamicImporters: entry.dynamicImporters ?? [] } : undefined
  }
  const bundle = { 'entry.js': { type: 'chunk', code: transformedCode } as any }
  await plugin.generateBundle.call({ getModuleInfo }, {}, bundle)
  return bundle['entry.js'].code as string
}

describe('nested unreachable components skip their scripts', () => {
  it('tracker imported only by unreferenced parent inside the components dir stays unused', async () => {
    const { plugin, transformed } = await deferScript()

    const out = await emit(plugin, transformed.code, {
      [TRACKER_ID]: { importers: [PARENT_ID] },
      [PARENT_ID]: { importers: [] },
    })

    expect(fetchMock, 'no third-party download may start').not.toHaveBeenCalled()
    expect(out).toContain(TRACKER_SRC)
    expect(out).not.toContain('__NUXT_SCRIPT_BUNDLE_')
    expect(out).not.toContain('crossorigin')
  })

  it('importer cycles without an exit stay unused', async () => {
    const { plugin, transformed } = await deferScript()

    const out = await emit(plugin, transformed.code, {
      [TRACKER_ID]: { importers: [PARENT_ID] },
      [PARENT_ID]: { importers: [CYCLE_SIBLING_ID] },
      [CYCLE_SIBLING_ID]: { importers: [PARENT_ID] },
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(out).toContain(TRACKER_SRC)
    expect(out).not.toContain('crossorigin')
  })

  it('dynamic importers count toward reachability', async () => {
    const { plugin, transformed } = await deferScript()

    await emit(plugin, transformed.code, {
      [TRACKER_ID]: { dynamicImporters: [PAGE_ID] },
      [PAGE_ID]: { importers: [] },
    })

    expect(fetchMock).toHaveBeenCalled()
  })
})
