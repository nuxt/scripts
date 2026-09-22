// Repro for nuxt/scripts#925. The bundler derived the registry key from the
// composable name (`useScriptTikTokPixel` → `tikTokPixel`) instead of using the
// registry key (`tiktokPixel`), so the first-party proxy config lookup missed
// and bundled pixels kept talking to TikTok directly.
import type { AssetBundlerTransformerOptions } from '../../packages/script/src/plugins/transform'
import type { RegistryScript } from '../../packages/script/src/runtime/types'
import { describe, expect, it, vi } from 'vitest'
import { NuxtScriptBundleTransformer } from '../../packages/script/src/plugins/transform'
import { buildProxyConfigsFromRegistry, registry } from '../../packages/script/src/registry'

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

describe('bundle transformer resolves proxy config by registry key', () => {
  it('rewrites bundled TikTok Pixel requests through the proxy', async () => {
    const tiktok = await registryEntry('tiktokPixel')
    const proxyConfigs = buildProxyConfigsFromRegistry(await registry())
    mockUpstream(Buffer.from(
      `(function(){var e="https://analytics.tiktok.com/i18n/identify";ttq.load("C1234");})();`,
    ))
    const renderedScript = new Map()

    await runTransform(
      `const instance = useScriptTikTokPixel({ id: 'C1234' }, { bundle: true })`,
      {
        renderedScript,
        scripts: [tiktok],
        proxyConfigs,
        proxyPrefix: '/_scripts/p',
      },
    )

    const stored = [...renderedScript.values()][0]
    expect(stored, 'bundle was not stored').toBeDefined()
    const content = (stored.content as Buffer).toString('utf-8')
    expect(content).toContain('/_scripts/p/analytics.tiktok.com')
    expect(content).not.toContain('"https://analytics.tiktok.com')
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
