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

  // Mirrors Snapchat scevent.min.js config bootstrap. When bundled, `S`
  // resolves to /_scripts/assets/... and `new URL(S).host` becomes the page
  // host. The SDK then requests /config/... from the Nuxt app origin.
  const snapchatLike = Buffer.from(
    `(function(){var s="sc-static.net",v="https://",l="snapchat.com",S="/_scripts/assets/scevent.min.js";function qr(t){var e={src:t}}var xe=y((function(){return new URL(S).host}),s);function De(t,n,r,e){return void 0===n&&(n=4),e?v+e+t:r?v+xe+t:v+"tr"+(ce()?"-shadow":6===n?"6":"")+"."+l+t}function Ea(t){var i="/config/no/"+t+".js?v=3.59.0";$n(xe,"localhost")?qr(De(i)):C?Sa(t,a):qr(xe!==s?v+xe+i:De(i))}})();`,
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

  it('applies snapchat config host patches to bundled proxy scripts', async () => {
    mockUpstream(snapchatLike)
    vi.mocked(hash).mockImplementationOnce(() => 'snapchat-script')
    const renderedScript = new Map()

    await runTransform(
      `const instance = useScriptSnapchatPixel({ id: '2295cbcc-cb3f-4727-8c09-1133b742722c' }, { bundle: true })`,
      {
        renderedScript,
        scripts: [
          {
            registryKey: 'snapchatPixel',
            src: 'https://sc-static.net/scevent.min.js',
            bundle: {
              sdkPatches: [{ type: 'replace-new-url-host', host: 'sc-static.net' }],
            },
            proxy: 'snapchatPixel',
            import: { name: 'useScriptSnapchatPixel', from: '' },
          },
        ] as any,
        proxyConfigs: {
          snapchatPixel: {
            domains: ['sc-static.net', 'tr.snapchat.com', 'pixel.tapad.com'],
            sdkPatches: [
              { type: 'replace-new-url-host', host: 'sc-static.net' },
              { type: 'replace-script-loader-url', fromDomain: 'tr.snapchat.com', pathPrefix: '/config' },
            ],
          } as any,
        },
        proxyPrefix: '/_scripts/p',
      },
    )

    const stored = [...renderedScript.values()][0]
    expect(stored, 'bundle was not stored').toBeDefined()
    const content = (stored.content as Buffer).toString('utf-8')
    expect(content).toContain('return "sc-static.net"')
    expect(content).toContain('qr(self.location.origin+"/_scripts/p/tr.snapchat.com"+i)')
    expect(content).not.toContain('new URL(S).host')
    expect(content).not.toContain('v+xe+i:De(i)')
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
