// Regression coverage for the deferred component bundling contract:
// - placeholders are patched while the bundler can still hash and map the chunk
// - replacement values are serialized, never spliced into an existing literal
// - reachability is decided against the module graph of the build being emitted
// - a build that failed leaves its registrations intact for the next attempt
import type { AssetBundlerTransformerOptions } from '../../packages/script/src/plugins/transform'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NuxtScriptBundleTransformer } from '../../packages/script/src/plugins/transform'

const mockBundleStorage: any = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  getItemRaw: vi.fn(),
  setItemRaw: vi.fn(),
  hasItem: vi.fn().mockResolvedValue(false),
}
vi.mock('../../packages/script/src/assets', () => ({
  bundleStorage: vi.fn(() => mockBundleStorage),
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const COMPONENT_DIR = '/app/node_modules/@nuxt/scripts/dist/runtime/components'
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
  return NuxtScriptBundleTransformer({
    renderedScript: new Map(),
    fallbackOnSrcOnBundleFail: true,
    componentDir: COMPONENT_DIR,
    ...options,
    nuxt: makeNuxt(),
  }).vite() as any
}

async function registerComponent(plugin: any, file: string, src: string): Promise<string> {
  const code = `const instance = useScript(${JSON.stringify(src)}, { bundle: true })`
  const transformed = await plugin.transform.handler.call({}, code, `${COMPONENT_DIR}/${file}?vue&type=script&setup=true&lang.ts`)
  expect(transformed?.code, 'the component must register a deferred placeholder').toContain('__NUXT_SCRIPT_BUNDLE_')
  return transformed.code as string
}

function makeContext(importers: string[]) {
  return { getModuleInfo: () => ({ importers, dynamicImporters: [] }) }
}

async function render(plugin: any, code: string, importers: string[], outputOptions: any = { sourcemap: false }) {
  const ctx = makeContext(importers)
  await plugin.renderStart.call(ctx, {}, {})
  return plugin.renderChunk.call(ctx, code, { fileName: 'entry.js' }, outputOptions)
}

function mockDownload(body = '/* widget */') {
  fetchMock.mockImplementation(() => Promise.resolve({
    ok: true,
    headers: { get: () => null },
    _data: Buffer.from(body),
  }))
}

/** Execute the emitted chunk with a stubbed `useScript` and return its first argument. */
function evaluateScriptArg(code: string): any {
  const calls: any[] = []
  // eslint-disable-next-line no-new-func
  const run = new Function('useScript', code)
  run((...args: any[]) => calls.push(args))
  expect(calls, 'the emitted chunk must still call useScript once').toHaveLength(1)
  return calls[0]![0]
}

describe('deferred component bundle resolution', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('patches the chunk in renderChunk so the bundler can still hash and map it', async () => {
    mockDownload()
    const plugin = makePlugin()
    const code = await registerComponent(plugin, 'Alpha.vue', 'https://example.com/alpha.js')

    // generateBundle runs after file names are fixed, so patching there would ship new
    // code under a stale cache-busted name and an unshifted sourcemap.
    expect(plugin.generateBundle).toBeUndefined()

    const result = await render(plugin, code, [APP_IMPORTER], { sourcemap: true })

    expect(result.code).toMatch(/\/_scripts\/assets\/[a-f0-9]{16}\.js/)
    expect(result.code).not.toContain('__NUXT_SCRIPT_')
    expect(result.map?.mappings, 'a rewritten chunk must carry a sourcemap for the shifted offsets').toBeTruthy()
  })

  it('leaves an untouched chunk alone', async () => {
    mockDownload()
    const plugin = makePlugin()
    await registerComponent(plugin, 'Alpha.vue', 'https://example.com/alpha.js')

    const result = await render(plugin, 'export const unrelated = 1', [APP_IMPORTER], { sourcemap: true })

    expect(result, 'a chunk with no placeholder must not be rewritten').toBeFalsy()
  })

  it('serializes an unused component src that carries quote characters', async () => {
    // eslint-disable-next-line no-template-curly-in-string -- a literal `${` in the src is the point
    const src = 'https://example.com/w.js?a=\'b&c="d&e=`f&g=${h}'
    const plugin = makePlugin()
    const code = await registerComponent(plugin, 'Quoted.vue', src)

    // No importer leaves the components dir, so the widget keeps its remote src.
    const result = await render(plugin, code, [])

    expect(fetchMock, 'an unused widget must not download').not.toHaveBeenCalled()
    expect(evaluateScriptArg(result.code)).toBe(src)
  })

  it('serializes into a chunk the minifier re-quoted with template literals', async () => {
    // eslint-disable-next-line no-template-curly-in-string -- a literal `${` in the src is the point
    const src = 'https://example.com/w.js?a=`b&c=${d}'
    const plugin = makePlugin()
    const code = await registerComponent(plugin, 'Quoted.vue', src)
    // oxc/rolldown normalize every string literal to a template literal.
    const minified = code.replace(/'/g, '`')

    const result = await render(plugin, minified, [])

    expect(evaluateScriptArg(result.code)).toBe(src)
  })

  it('re-decides reachability on every build instead of reusing the first verdict', async () => {
    mockDownload()
    const plugin = makePlugin()
    const code = await registerComponent(plugin, 'Alpha.vue', 'https://example.com/alpha.js')

    const unused = await render(plugin, code, [])
    expect(unused.code).toContain('https://example.com/alpha.js')
    expect(fetchMock).not.toHaveBeenCalled()

    // A watch rebuild adds the page that uses the widget: the same chunk must now
    // resolve to the bundled asset rather than the verdict cached from build one.
    const used = await render(plugin, code, [APP_IMPORTER])
    expect(used.code).toMatch(/\/_scripts\/assets\/[a-f0-9]{16}\.js/)
    expect(used.code).not.toContain('https://example.com/alpha.js')
  })

  it('keeps registrations after a failed build so the retry resolves them', async () => {
    fetchMock.mockImplementation(() => Promise.resolve({
      ok: false,
      status: 500,
      headers: { get: () => null },
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    }))
    const plugin = makePlugin({ fallbackOnSrcOnBundleFail: false })
    const code = await registerComponent(plugin, 'Alpha.vue', 'https://example.com/alpha.js')

    await expect(render(plugin, code, [APP_IMPORTER])).rejects.toThrow(/alpha\.js/)

    mockDownload()
    const retry = await render(plugin, code, [APP_IMPORTER])

    expect(retry.code).toMatch(/\/_scripts\/assets\/[a-f0-9]{16}\.js/)
    expect(retry.code).not.toContain('__NUXT_SCRIPT_')
  })

  it('drops a stale registration when the component changes its src', async () => {
    mockDownload()
    const plugin = makePlugin()
    await registerComponent(plugin, 'Alpha.vue', 'https://example.com/old.js')
    const code = await registerComponent(plugin, 'Alpha.vue', 'https://example.com/new.js')

    await render(plugin, code, [APP_IMPORTER])

    expect(fetchMock.mock.calls.map(call => call[0])).toEqual(['https://example.com/new.js'])
  })
})
