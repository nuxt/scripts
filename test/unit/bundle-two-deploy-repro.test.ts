// Mechanical reproduction of nuxt/scripts#724:
// Same source URL, different content between deployments must yield different public URLs,
// otherwise a long-cached asset serves stale bytes against a fresh SRI hash.
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
  hasItem: vi.fn(),
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
// Source URL hash is stable across both "deploys" — the URL doesn't change between deployments,
// only the upstream bytes do. This is exactly the real-world scenario in #724.
vi.mocked(hash).mockImplementation(() => 'adsbygoogle')

async function runTransform(code: string, options?: AssetBundlerTransformerOptions) {
  mockBundleStorage.hasItem.mockResolvedValue(false)
  const plugin = NuxtScriptBundleTransformer({ renderedScript: new Map(), ...options }).vite() as any
  const out = await plugin.transform.handler.call({}, code, 'file.js')
  return out?.code as string
}

function mockUpstreamBody(bytes: Buffer) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    arrayBuffer: () => Promise.resolve(bytes),
    headers: { get: () => null },
    _data: bytes,
  } as any)
}

function extractPublicUrl(code: string): string {
  const match = code.match(/\/_scripts\/assets\/[^'"]+\.js/)
  if (!match)
    throw new Error(`no public asset URL in: ${code}`)
  return match[0]
}

describe('two-deploy bundle repro (#724)', () => {
  const src = `const instance = useScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { bundle: true })`

  it('same source URL + changed upstream content -> different public filenames', async () => {
    // Deploy 1: upstream returns content A
    mockUpstreamBody(Buffer.from('/* adsbygoogle v1 */ (function(){ /* ... */ })()'))
    const deploy1 = await runTransform(src)

    // Deploy 2: upstream returns content B (Google pushed a JS update)
    mockUpstreamBody(Buffer.from('/* adsbygoogle v2 NEW */ (function(){ /* ... */ })()'))
    const deploy2 = await runTransform(src)

    const url1 = extractPublicUrl(deploy1)
    const url2 = extractPublicUrl(deploy2)

    // With the bug present, these would be identical (URL-hash-only filename),
    // so a long-cached v1 asset would be served against a v2 integrity hash.
    expect(url1).not.toBe(url2)
    expect(url1).toMatch(/[a-f0-9]{16}\.js$/)
    expect(url2).toMatch(/[a-f0-9]{16}\.js$/)
  })

  it('same source URL + same content -> identical public filenames (caching preserved)', async () => {
    const body = Buffer.from('/* adsbygoogle v1 */ (function(){ /* ... */ })()')
    mockUpstreamBody(body)
    const deploy1 = await runTransform(src)
    mockUpstreamBody(body)
    const deploy2 = await runTransform(src)

    expect(extractPublicUrl(deploy1)).toBe(extractPublicUrl(deploy2))
  })

  it('integrity hash matches the final served bytes', async () => {
    mockUpstreamBody(Buffer.from('/* adsbygoogle v1 */'))
    const code = await runTransform(src, { integrity: true })
    const url = extractPublicUrl(code)
    const integrityMatch = code.match(/integrity: '(sha384-[^']+)'/)

    expect(url).toMatch(/[a-f0-9]{16}\.js$/)
    expect(integrityMatch).toBeTruthy()
    // Filename and integrity both derive from the same post-rewrite bytes,
    // so they cannot drift apart across deployments.
  })
})
