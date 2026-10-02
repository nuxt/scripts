// Visitor-specific loaders must stay remote, including explicit bundle overrides.
import type { AssetBundlerTransformerOptions } from '../../packages/script/src/plugins/transform'
import type { RegistryScript } from '../../packages/script/src/runtime/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NuxtScriptBundleTransformer } from '../../packages/script/src/plugins/transform'
import { buildProxyConfigsFromRegistry, registry, resolveCapabilities } from '../../packages/script/src/registry'

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

const mockNuxt = {
  options: { buildDir: '.nuxt', app: { baseURL: '/' }, runtimeConfig: { app: {} } },
  hooks: { hook: vi.fn() },
} as any

function mockUpstream(bytes: Buffer) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    arrayBuffer: () => Promise.resolve(bytes),
    headers: { get: () => null },
    _data: bytes,
  } as any)
}

async function runTransform(code: string, options: AssetBundlerTransformerOptions) {
  const plugin = NuxtScriptBundleTransformer({ ...options, nuxt: mockNuxt }).vite() as any
  await plugin.transform.handler.call({}, code, 'file.js')
}

async function registryEntry(registryKey: string): Promise<Required<RegistryScript>> {
  const scripts = await registry()
  const entry = scripts.find(s => s.registryKey === registryKey)
  if (!entry)
    throw new Error(`registry entry not found: ${registryKey}`)
  return entry as Required<RegistryScript>
}

describe('bundle transformer preserves visitor-specific loaders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchMock.mockReset()
  })

  it.each([
    ['tiktokPixel', 'useScriptTikTokPixel', '{ id: \'C1234\' }'],
    ['googleAnalytics', 'useScriptGoogleAnalytics', '{ id: \'G-TEST\' }'],
    ['googleTagManager', 'useScriptGoogleTagManager', '{ id: \'GTM-TEST\' }'],
  ])('does not download %s at build time', async (key, composable, input) => {
    const entry = await registryEntry(key)
    const renderedScript = new Map()
    mockUpstream(Buffer.from('window.visitorId = "build-machine"'))

    await runTransform(
      `const instance = ${composable}(${input})`,
      { renderedScript, scripts: [entry] },
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(renderedScript.size).toBe(0)
  })

  it.each([
    ['tiktokPixel', 'useScriptTikTokPixel', '{ id: \'C1234\', src: \'https://analytics.tiktok.com/i18n/pixel/events.js\' }'],
    ['googleAnalytics', 'useScriptGoogleAnalytics', '{ id: \'G-TEST\', src: \'https://www.googletagmanager.com/gtag/js\' }'],
    ['googleTagManager', 'useScriptGoogleTagManager', '{ id: \'GTM-TEST\', src: \'https://www.googletagmanager.com/gtm.js\' }'],
    ['usercentrics', 'useScriptUsercentrics', '{ rulesetId: \'test\' }'],
  ])('ignores forced bundling for unsupported %s', async (key, composable, input) => {
    const entry = await registryEntry(key)
    const renderedScript = new Map()
    mockUpstream(Buffer.from('window.visitorId = "build-machine"'))

    await runTransform(
      `const instance = ${composable}(${input}, { bundle: 'force' })`,
      { renderedScript, scripts: [entry] },
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(renderedScript.size).toBe(0)
  })

  it('does not enable TikTok proxy routing through user overrides', async () => {
    const entry = await registryEntry('tiktokPixel')
    expect(resolveCapabilities(entry, { bundle: true, proxy: true })).toEqual({
      bundle: false,
      proxy: false,
      partytown: false,
    })
  })

  it('rewrites bundled LinkedIn Insight requests through the proxy', async () => {
    const linkedin = await registryEntry('linkedinInsight')
    const proxyConfigs = buildProxyConfigsFromRegistry(await registry())
    mockUpstream(Buffer.from(
      `(function(){var e="https://snap.licdn.com/li.lms-analytics/collect";_t.track();})();`,
    ))
    const renderedScript = new Map()

    await runTransform(
      `const instance = useScriptLinkedInInsight({ id: '1234567' }, { bundle: true })`,
      {
        renderedScript,
        scripts: [linkedin],
        proxyConfigs,
        proxyPrefix: '/_scripts/p',
      },
    )

    const stored = [...renderedScript.values()][0]
    expect(stored, 'bundle was not stored').toBeDefined()
    const content = (stored.content as Buffer).toString('utf-8')
    expect(content).toContain('/_scripts/p/snap.licdn.com')
    expect(content).not.toContain('"https://snap.licdn.com')
  })
})
