import type { RenderedScriptMeta } from '../../packages/script/src/plugins/transform'
import { runInNewContext } from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NuxtScriptBundleTransformer } from '../../packages/script/src/plugins/transform'
import { buildProxyConfigsFromRegistry, registry } from '../../packages/script/src/registry'
import { runTransform } from '../utils/unplugin'

vi.mock('../../packages/script/src/assets', () => ({
  bundleStorage: () => ({
    hasItem: async () => false,
    setItem: async () => {},
    setItemRaw: async () => {},
  }),
}))

afterEach(() => vi.unstubAllGlobals())

describe('cloudflare web analytics transport', () => {
  it('keeps bundled beacon events on the Cloudflare client endpoint', async () => {
    const beacon = `navigator.sendBeacon('https://cloudflareinsights.com/cdn-cgi/rum', '{"eventType":1}')`
    vi.stubGlobal('fetch', vi.fn(async () => new Response(beacon)))
    const scripts = await registry()
    const renderedScript = new Map<string, RenderedScriptMeta | Error>()
    const plugin = NuxtScriptBundleTransformer({
      scripts,
      renderedScript,
      proxyConfigs: buildProxyConfigsFromRegistry(scripts),
      proxyPrefix: '/_scripts/p',
      nuxt: {
        options: { buildDir: '.nuxt', app: { baseURL: '/' }, runtimeConfig: { app: {} } },
        hooks: { hook: vi.fn() },
      } as any,
    }).vite()

    await runTransform(plugin, {
      id: 'analytics.ts',
      code: `useScriptCloudflareWebAnalytics({ token: 'test-token' })`,
    })

    const sent: { url: string, body: string }[] = []
    const sendBeacon = (url: string, body: string) => sent.push({ url, body })
    for (const asset of renderedScript.values()) {
      if (asset instanceof Error)
        throw asset
      runInNewContext(asset.content.toString(), {
        navigator: { sendBeacon },
        __nuxtScripts: { sendBeacon },
        self: { location: { origin: 'https://example.com' } },
      })
    }

    expect(sent).toEqual([{
      url: 'https://cloudflareinsights.com/cdn-cgi/rum',
      body: '{"eventType":1}',
    }])
  })
})
