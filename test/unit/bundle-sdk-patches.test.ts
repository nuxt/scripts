// Integration guard for bundle-only sdkPatches (nuxt/scripts#720 / Fathom).
// Exercises the full NuxtScriptBundleTransformer → downloadScript →
// rewriteScriptUrlsAST pipeline to prove the neutralize-domain-check patch is
// actually applied to the stored bundle. A prior regression gated the rewrite
// on proxyRewrites.length, so bundle-only patches were silently dropped while
// direct unit tests of rewriteScriptUrlsAST still passed.
import type { AssetBundlerTransformerOptions } from '../../packages/script/src/plugins/transform'
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

vi.mock('@nuxt/kit', async (og) => {
  const mod = await og<typeof import('@nuxt/kit')>()
  const nuxt = {
    options: { buildDir: '.nuxt', app: { baseURL: '/' }, runtimeConfig: { app: {} } },
    hooks: { hook: vi.fn() },
  }
  return { ...mod, useNuxt: () => nuxt, tryUseNuxt: () => nuxt }
})

vi.mocked(hasProtocol).mockImplementation(() => true)
vi.mocked(hash).mockImplementation(() => 'fathom-script')

function mockUpstream(bytes: Buffer) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    arrayBuffer: () => Promise.resolve(bytes),
    headers: { get: () => null },
    _data: bytes,
  } as any)
}

async function runTransform(code: string, options: AssetBundlerTransformerOptions) {
  const plugin = NuxtScriptBundleTransformer(options).vite() as any
  await plugin.transform.handler.call({}, code, 'file.js')
}

describe('bundle-only sdkPatches integration', () => {
  const fathomLike = Buffer.from(
    `(function(){var e=document.currentScript;if(e.src.indexOf("cdn.usefathom.com")<0){t="custom"}})();`,
  )

  // Mirrors the Ahrefs analytics.js endpoint derivation: it computes its
  // `/api/event` host as `new URL(currentScript.src).origin`. When the script
  // is bundled, that origin becomes the local Nuxt origin and beacons land on
  // a 404. The replace-new-url-origin patch redirects the derivation through
  // the script's proxy path.
  const ahrefsLike = Buffer.from(
    `(function(){var s=document.currentScript;var E=s.getAttribute("data-api")||new URL(s.src).origin+"/api/event";var _=s.getAttribute("data-error")||new URL(s.src).origin+"/api/error";})();`,
  )

  it('applies neutralize-domain-check to bundle-only scripts (no proxy)', async () => {
    mockUpstream(fathomLike)
    const renderedScript = new Map()

    await runTransform(
      `const instance = useScriptFathomAnalytics({ site: '123' }, { bundle: true })`,
      {
        renderedScript,
        scripts: [
          {
            bundle: {
              resolve: () => 'https://cdn.usefathom.com/script.js',
              sdkPatches: [{ type: 'neutralize-domain-check', domain: 'cdn.usefathom.com' }],
            },
            import: { name: 'useScriptFathomAnalytics', from: '' },
          },
        ],
      },
    )

    const stored = [...renderedScript.values()][0]
    expect(stored, 'bundle was not stored').toBeDefined()
    const content = (stored.content as Buffer).toString('utf-8')
    // Patch rewrites `< 0` to `< -1` on the fathom domain indexOf comparison,
    // preserving the original whitespace (minified `<0` stays minified).
    expect(content).toMatch(/indexOf\("cdn\.usefathom\.com"\)\s*<\s*-1/)
    expect(content).not.toMatch(/indexOf\("cdn\.usefathom\.com"\)\s*<\s*0\b/)
  })

  it('applies replace-new-url-origin to bundled scripts that derive endpoints from currentScript.src', async () => {
    mockUpstream(ahrefsLike)
    vi.mocked(hash).mockImplementationOnce(() => 'ahrefs-script')
    const renderedScript = new Map()

    await runTransform(
      `const instance = useScriptAhrefsAnalytics({ key: 'k' }, { bundle: true })`,
      {
        renderedScript,
        scripts: [
          {
            registryKey: 'ahrefsAnalytics',
            bundle: { resolve: () => 'https://analytics.ahrefs.com/analytics.js' },
            proxy: 'ahrefsAnalytics',
            import: { name: 'useScriptAhrefsAnalytics', from: '' },
          },
        ] as any,
        proxyConfigs: {
          ahrefsAnalytics: {
            domains: ['analytics.ahrefs.com'],
            sdkPatches: [{ type: 'replace-new-url-origin', fromDomain: 'analytics.ahrefs.com' }],
          } as any,
        },
        proxyPrefix: '/_scripts/p',
      },
    )

    const stored = [...renderedScript.values()][0]
    expect(stored, 'bundle was not stored').toBeDefined()
    const content = (stored.content as Buffer).toString('utf-8')
    // Both /api/event and /api/error endpoints get redirected through the proxy.
    // The patch wraps the rewritten origin in parens to preserve operator precedence
    // when the original `new URL(...).origin` was concatenated with a path literal.
    expect(content).toMatch(/\(self\.location\.origin\+"\/_scripts\/p\/analytics\.ahrefs\.com"\)\+"\/api\/event"/)
    expect(content).toMatch(/\(self\.location\.origin\+"\/_scripts\/p\/analytics\.ahrefs\.com"\)\+"\/api\/error"/)
    // Original derivation is gone — no remaining `new URL(s.src).origin`.
    expect(content).not.toMatch(/new URL\(s\.src\)\.origin/)
  })

  it('leaves bundles untouched when no patches are configured', async () => {
    mockUpstream(fathomLike)
    const renderedScript = new Map()

    await runTransform(
      `const instance = useScript('https://cdn.usefathom.com/script.js', { bundle: true })`,
      {
        renderedScript,
        scripts: [
          {
            bundle: { resolve: () => 'https://cdn.usefathom.com/script.js' },
            import: { name: 'useScript', from: '' },
          },
        ],
      },
    )

    const stored = [...renderedScript.values()][0]
    expect(stored).toBeDefined()
    const content = (stored.content as Buffer).toString('utf-8')
    expect(content).toBe(fathomLike.toString('utf-8'))
  })
})
