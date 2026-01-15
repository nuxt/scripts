import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'acorn-loose'
import { joinURL, withBase, hasProtocol } from 'ufo'
import { hash } from 'ohash'
import { $fetch } from 'ofetch'
import type { AssetBundlerTransformerOptions } from '../../src/plugins/transform'
import { NuxtScriptBundleTransformer } from '../../src/plugins/transform'
import type { IntercomInput } from '~/src/runtime/registry/intercom'
import type { NpmInput } from '~/src/runtime/registry/npm'

const ohash = (await vi.importActual<typeof import('ohash')>('ohash')).hash
vi.mock('ohash', async (og) => {
  const mod = (await og<typeof import('ohash')>())
  const mock = vi.fn(mod.hash)
  return {
    ...mod,
    hash: mock,
  }
})

// TODO re-enable
// vi.mock('ofetch', async (og) => {
//   const mod = (await og<typeof import('ofetch')>())
//   const mock = vi.fn(mod.$fetch)
//   return {
//     ...mod,
//     $fetch: mock,
//   }
// })

vi.mock('ufo', async (og) => {
  const mod = (await og<typeof import('ufo')>())
  const mock = vi.fn(mod.hasProtocol)
  return {
    ...mod,
    hasProtocol: mock,
  }
})

// Mock bundleStorage for cache invalidation tests
const mockBundleStorage: any = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  getItemRaw: vi.fn(),
  setItemRaw: vi.fn(),
  hasItem: vi.fn(),
}
vi.mock('../../src/assets', () => ({
  bundleStorage: vi.fn(() => mockBundleStorage),
}))
vi.stubGlobal('fetch', vi.fn(() => {
  return Promise.resolve({ arrayBuffer: vi.fn(() => Buffer.from('')), ok: true, headers: { get: vi.fn() } })
}))

vi.mock('@nuxt/kit', async (og) => {
  const mod = await og<typeof import('@nuxt/kit')>()

  return {
    ...mod,
    useNuxt() {
      return {
        options: {
          buildDir: '.nuxt',
          app: {
            baseURL: '/',
          },
          runtimeConfig: {
            app: {},
          },
        },
        hooks: {
          hook: vi.fn(),
        },
      }
    },
    tryUseNuxt() {
      return {
        options: {
          buildDir: '.nuxt',
          app: {
            baseURL: '/',
          },
          runtimeConfig: {
            app: {},
          },
        },
        hooks: {
          hook: vi.fn(),
        },
      }
    },
  }
})

// we want to control normalizeScriptData() output
vi.mocked(hasProtocol).mockImplementation(() => true)
// hash receive a URL object, we want to mock it to return the pathname by default
vi.mocked(hash).mockImplementation(src => src.pathname)

async function transform(code: string | string[], options?: AssetBundlerTransformerOptions) {
  const plugin = NuxtScriptBundleTransformer(options).vite() as any
  const res = await plugin.transform.call(
    { parse: (code: string) => parse(code, { ecmaVersion: 2022, sourceType: 'module', allowImportExportEverywhere: true, allowAwaitOutsideFunction: true }) },
    Array.isArray(code) ? code.join('\n') : code,
    'file.js',
  )
  return res?.code
}

describe('nuxtScriptTransformer', () => {
  it('string arg', async () => {
    vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')
    const code = await transform(
      `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
      bundle: true,
    })`,

    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScript('/_scripts/beacon.min.js', )"`)
  })

  it('options arg', async () => {
    vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')
    const code = await transform(
      `const instance = useScript({ defer: true, src: 'https://static.cloudflareinsights.com/beacon.min.js' }, {
      bundle: true,
    })`,

    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScript({ defer: true, src: '/_scripts/beacon.min.js' }, )"`)
  })

  it('dynamic src is not transformed', async () => {
    const code = await transform(
      // eslint-disable-next-line no-useless-escape
      `const instance = useScript({ key: 'cloudflareAnalytics', src: \`https://static.cloudflareinsights.com/$\{123\}beacon.min.js\` })`,
    )
    expect(code).toMatchInlineSnapshot(`undefined`)
  })

  it('dynamic src with bundle option becomes unsupported', async () => {
    const code = await transform(

      `const instance = useScript(\`https://example.com/$\{version}.js\`, { bundle: true })`,
    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScript(\`https://example.com/$\{version}.js\`, { bundle: 'unsupported' })"`)
  })

  it('supplied src integration is transformed - opt-in', async () => {
    const code = await transform(
      `const instance = useScriptFathomAnalytics({ src: 'https://cdn.fathom/custom.js' }, { bundle: true, })`,
      {
        defaultBundle: false,
        scripts: [
          {
            scriptBundling() {
              return 'https://cdn.usefathom.com/script.js'
            },
            import: {
              name: 'useScriptFathomAnalytics',
              from: '',
            },
          },
        ],
      },
    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScriptFathomAnalytics({ src: '/_scripts/custom.js.js' }, )"`)
  })

  it('registry script with scriptOptions.bundle - correct usage', async () => {
    vi.mocked(hash).mockImplementationOnce(() => 'analytics')
    const code = await transform(
      `const instance = useScriptGoogleAnalytics({
        id: 'GA_MEASUREMENT_ID',
        scriptOptions: {
          bundle: true
        }
      })`,
      {
        defaultBundle: false,
        scripts: [
          {
            scriptBundling() {
              return 'https://www.googletagmanager.com/gtag/js'
            },
            import: {
              name: 'useScriptGoogleAnalytics',
              from: '',
            },
          },
        ],
      },
    )
    expect(code).toMatchInlineSnapshot(`
      "const instance = useScriptGoogleAnalytics({ scriptInput: { src: '/_scripts/analytics.js' }, 
              id: 'GA_MEASUREMENT_ID',
              scriptOptions: {
                bundle: true
              }
            })"
    `)
  })

  it('registry script with top-level bundle also transforms', async () => {
    vi.mocked(hash).mockImplementationOnce(() => 'gtag/js')
    const code = await transform(
      `const instance = useScriptGoogleAnalytics({
        id: 'GA_MEASUREMENT_ID'
      }, {
        bundle: true
      })`,
      {
        defaultBundle: false,
        scripts: [
          {
            scriptBundling() {
              return 'https://www.googletagmanager.com/gtag/js'
            },
            import: {
              name: 'useScriptGoogleAnalytics',
              from: '',
            },
          },
        ],
      },
    )
    expect(code).toMatchInlineSnapshot(`
      "const instance = useScriptGoogleAnalytics({ scriptInput: { src: '/_scripts/gtag/js.js' }, 
              id: 'GA_MEASUREMENT_ID'
            }, )"
    `)
  })

  it('static src integration is transformed - opt-in', async () => {
    const code = await transform(
      `const instance = useScriptFathomAnalytics({ site: '123' }, { bundle: true, })`,
      {
        defaultBundle: false,
        scripts: [
          {
            scriptBundling() {
              return 'https://cdn.usefathom.com/script.js'
            },
            import: {
              name: 'useScriptFathomAnalytics',
              from: '',
            },
          },
        ],
      },
    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScriptFathomAnalytics({ scriptInput: { src: '/_scripts/script.js.js' },  site: '123' }, )"`)
  })

  it('static src integration is transformed - opt-out', async () => {
    const code = await transform(
      `const instance = useScriptFathomAnalytics({ site: '123' }, { bundle: false })`,
      {
        defaultBundle: true,
        scripts: [
          {
            scriptBundling() {
              return 'https://cdn.usefathom.com/script.js'
            },
            import: {
              name: 'useScriptFathomAnalytics',
              from: '',
            },
          },
        ],

      },
    )
    expect(code).toMatchInlineSnapshot(`undefined`)
  })

  it('dynamic src integration is transformed - default', async () => {
    vi.mocked(hash).mockImplementationOnce(src => (src.pathname))
    const code = await transform(
      `const instance = useScriptIntercom({ app_id: '123' })`,
      {
        defaultBundle: true,
        scripts: [
          {
            scriptBundling(options?: IntercomInput) {
              return joinURL(`https://widget.intercom.io/widget`, options?.app_id || '')
            },
            import: {
              name: 'useScriptIntercom',
              from: '',
            },
          },
        ],

      },
    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScriptIntercom({ scriptInput: { src: '/_scripts/widget/123.js' },  app_id: '123' })"`)
  })

  it('dynamic src integration can be opted-out explicit', async () => {
    const code = await transform(
      `const instance = useScriptIntercom({ app_id: '123' }, { bundle: false })`,
      {
        defaultBundle: true,
        scripts: [
          {
            scriptBundling(options?: IntercomInput) {
              return joinURL(`https://widget.intercom.io/widget`, options?.app_id || '')
            },
            import: {
              name: 'useScriptIntercom',
              from: '',
            },
          },
        ],

      },
    )
    expect(code).toMatchInlineSnapshot(`undefined`)
  })

  it('dynamic src integration can be opt-in explicit', async () => {
    vi.mocked(hash).mockImplementationOnce(src => src.pathname)
    const code = await transform(
      `const instance = useScriptIntercom({ app_id: '123' }, { bundle: true })`,
      {
        defaultBundle: false,
        scripts: [
          {
            scriptBundling(options?: IntercomInput) {
              return joinURL(`https://widget.intercom.io/widget`, options?.app_id || '')
            },
            import: {
              name: 'useScriptIntercom',
              from: '',
            },
          },
        ],

      },
    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScriptIntercom({ scriptInput: { src: '/_scripts/widget/123.js' },  app_id: '123' }, )"`)
  })

  it('can re-use opt-in once it\'s loaded', async () => {
    const code = await transform(
      [`const instance = useScriptIntercom({ app_id: '123' }, { bundle: true })`, `const instance2 = useScriptIntercom()`].join('\n'),
      {
        defaultBundle: false,
        scripts: [
          {
            scriptBundling(options?: IntercomInput) {
              return joinURL(`https://widget.intercom.io/widget`, options?.app_id || '')
            },
            import: {
              name: 'useScriptIntercom',
              from: '',
            },
          },
        ],
      },
    )
    expect(code).toMatchInlineSnapshot(`
      "const instance = useScriptIntercom({ scriptInput: { src: '/_scripts/widget/123.js' },  app_id: '123' }, )
      const instance2 = useScriptIntercom()"
    `)
  })

  it('useScriptNpm', async () => {
    vi.mocked(hash).mockImplementationOnce(src => ohash(src.pathname))
    const code = await transform(
      `const instance = useScriptNpm({ packageName: 'jsconfetti', version: '1.0.0', file: 'dist/index.js' })`,
      {
        defaultBundle: true,
        scripts: [
          {
            scriptBundling(options?: NpmInput) {
              return withBase(options?.file || '', `https://unpkg.com/${options?.packageName || ''}@${options?.version || 'latest'}`)
            },
            import: {
              name: 'useScriptNpm',
              from: '',
            },
          },
        ],

      },
    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScriptNpm({ scriptInput: { src: '/_scripts/jKysJQD_rnWtMaRpo62kJcIJ4PsW_O2f1NXNqksJbMk.js' },  packageName: 'jsconfetti', version: '1.0.0', file: 'dist/index.js' })"`)
  })

  it('useScript broken #1', async () => {
    vi.mocked(hash).mockImplementationOnce(src => ohash(src.pathname))

    const code = await transform(
      `import { defineComponent as _defineComponent } from "vue";
import { useScript } from "#imports";
const _sfc_main = /* @__PURE__ */ _defineComponent({
  __name: "bundle-use-script",
  setup(__props, { expose: __expose }) {
    __expose();
    const { myScript, $script } = useScript("/myScript.js", {
      bundle: true,
      use() {
        return {
          // @ts-expect-error untyped
          myScript: window.myScript
        };
      }
    });
    myScript("test");
    const __returned__ = { myScript, $script };
    Object.defineProperty(__returned__, "__isScriptSetup", { enumerable: false, value: true });
    return __returned__;
  }
});`,
    )
    expect(code.includes('useScript(\'/_scripts/vFJ41_fzYQOTRPr3v6G1PkI0hc5tMy0HGrgFjhaJhOI.js\', {')).toBeTruthy()
  })

  it('uses baseURL without cdnURL', async () => {
    vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')

    const code = await transform(
      `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
      bundle: true,
    })`,
      {
        assetsBaseURL: '/_scripts',
      },
    )

    // Without cdnURL configured, it should use baseURL
    expect(code).toMatchInlineSnapshot(`"const instance = useScript('/_scripts/beacon.min.js', )"`)
  })

  it('bundle: "force" works the same as bundle: true', async () => {
    vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')
    const code = await transform(
      `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
      bundle: 'force',
    })`,

    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScript('/_scripts/beacon.min.js', )"`)
  })

  it('registry script with scriptOptions.bundle: "force"', async () => {
    vi.mocked(hash).mockImplementationOnce(() => 'analytics')
    const code = await transform(
      `const instance = useScriptGoogleAnalytics({
        id: 'GA_MEASUREMENT_ID',
        scriptOptions: {
          bundle: 'force'
        }
      })`,
      {
        defaultBundle: false,
        scripts: [
          {
            scriptBundling() {
              return 'https://www.googletagmanager.com/gtag/js'
            },
            import: {
              name: 'useScriptGoogleAnalytics',
              from: '',
            },
          },
        ],
      },
    )
    expect(code).toMatchInlineSnapshot(`
      "const instance = useScriptGoogleAnalytics({ scriptInput: { src: '/_scripts/analytics.js' }, 
              id: 'GA_MEASUREMENT_ID',
              scriptOptions: {
                bundle: 'force'
              }
            })"
    `)
  })

  it('top-level bundle: "force"', async () => {
    vi.mocked(hash).mockImplementationOnce(() => 'gtag/js')
    const code = await transform(
      `const instance = useScriptGoogleAnalytics({
        id: 'GA_MEASUREMENT_ID'
      }, {
        bundle: 'force'
      })`,
      {
        defaultBundle: false,
        scripts: [
          {
            scriptBundling() {
              return 'https://www.googletagmanager.com/gtag/js'
            },
            import: {
              name: 'useScriptGoogleAnalytics',
              from: '',
            },
          },
        ],
      },
    )
    expect(code).toMatchInlineSnapshot(`
      "const instance = useScriptGoogleAnalytics({ scriptInput: { src: '/_scripts/gtag/js.js' }, 
              id: 'GA_MEASUREMENT_ID'
            }, )"
    `)
  })

  it('custom cache max age is passed through', async () => {
    vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')
    const customCacheMaxAge = 3600000 // 1 hour

    const code = await transform(
      `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
        bundle: true,
      })`,
      {
        cacheMaxAge: customCacheMaxAge,
      },
    )

    // Verify transformation still works with custom cache duration
    expect(code).toMatchInlineSnapshot(`"const instance = useScript('/_scripts/beacon.min.js', )"`)
  })

  describe('cache invalidation', () => {
    beforeEach(() => {
      // Reset all mocks for bundleStorage
      mockBundleStorage.getItem.mockReset()
      mockBundleStorage.setItem.mockReset()
      mockBundleStorage.getItemRaw.mockReset()
      mockBundleStorage.setItemRaw.mockReset()
      mockBundleStorage.hasItem.mockReset()
      vi.clearAllMocks()
    })

    it('should detect expired cache when metadata is missing', async () => {
      // Mock storage to not have metadata
      mockBundleStorage.getItem.mockResolvedValue(null)

      // Import the isCacheExpired function - we need to access it for testing
      const { isCacheExpired } = await import('../../src/plugins/transform')

      const isExpired = await isCacheExpired(mockBundleStorage, 'test-file.js')
      expect(isExpired).toBe(true)
      expect(mockBundleStorage.getItem).toHaveBeenCalledWith('bundle-meta:test-file.js')
    })

    it('should detect expired cache when timestamp is missing', async () => {
      // Mock storage to have metadata without timestamp
      mockBundleStorage.getItem.mockResolvedValue({})

      const { isCacheExpired } = await import('../../src/plugins/transform')

      const isExpired = await isCacheExpired(mockBundleStorage, 'test-file.js')
      expect(isExpired).toBe(true)
    })

    it('should detect expired cache when cache is older than maxAge', async () => {
      const now = Date.now()
      const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000)
      const oneDayInMs = 24 * 60 * 60 * 1000

      // Mock storage to have old timestamp
      mockBundleStorage.getItem.mockResolvedValue({ timestamp: twoDaysAgo })

      const { isCacheExpired } = await import('../../src/plugins/transform')

      const isExpired = await isCacheExpired(mockBundleStorage, 'test-file.js', oneDayInMs)
      expect(isExpired).toBe(true)
    })

    it('should detect fresh cache when within maxAge', async () => {
      const now = Date.now()
      const oneHourAgo = now - (60 * 60 * 1000)
      const oneDayInMs = 24 * 60 * 60 * 1000

      // Mock storage to have recent timestamp
      mockBundleStorage.getItem.mockResolvedValue({ timestamp: oneHourAgo })

      const { isCacheExpired } = await import('../../src/plugins/transform')

      const isExpired = await isCacheExpired(mockBundleStorage, 'test-file.js', oneDayInMs)
      expect(isExpired).toBe(false)
    })

    it('should use custom cacheMaxAge when provided', async () => {
      const now = Date.now()
      const twoHoursAgo = now - (2 * 60 * 60 * 1000)
      const oneHourInMs = 60 * 60 * 1000

      // Mock storage to have timestamp older than custom maxAge
      mockBundleStorage.getItem.mockResolvedValue({ timestamp: twoHoursAgo })

      const { isCacheExpired } = await import('../../src/plugins/transform')

      const isExpired = await isCacheExpired(mockBundleStorage, 'test-file.js', oneHourInMs)
      expect(isExpired).toBe(true)
    })

    it('should bypass cache when forceDownload is true', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')

      // Mock that cache exists and is fresh
      mockBundleStorage.hasItem.mockResolvedValue(true)
      mockBundleStorage.getItem.mockResolvedValue({ timestamp: Date.now() })
      mockBundleStorage.getItemRaw.mockResolvedValue(Buffer.from('cached content'))

      // Mock successful fetch for force download
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        headers: { get: () => null },
      } as any)

      const code = await transform(
        `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
          bundle: 'force',
        })`,
        {
          renderedScript: new Map(),
        },
      )

      // Verify the script was fetched (not just cached)
      expect(fetch).toHaveBeenCalled()
      expect(code).toMatchInlineSnapshot(`"const instance = useScript('/_scripts/beacon.min.js', )"`)
    })

    it('should store bundle metadata with timestamp on download', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')

      // Mock that cache doesn't exist
      mockBundleStorage.hasItem.mockResolvedValue(false)

      // Mock successful fetch
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        headers: { get: () => null },
      } as any)

      const renderedScript = new Map()

      const code = await transform(
        `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
          bundle: true,
        })`,
        {
          renderedScript,
        },
      )

      expect(code).toMatchInlineSnapshot(`"const instance = useScript('/_scripts/beacon.min.js', )"`)

      // Verify metadata was stored
      const metadataCall = mockBundleStorage.setItem.mock.calls.find(call =>
        call[0].startsWith('bundle-meta:'),
      )
      expect(metadataCall).toBeDefined()
      expect(metadataCall[1]).toMatchObject({
        timestamp: expect.any(Number),
        src: 'https://static.cloudflareinsights.com/beacon.min.js',
        filename: expect.stringContaining('beacon.min'),
      })
    })

    it('should use cached content when cache is fresh', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')

      const cachedContent = Buffer.from('cached script content')

      // Mock that cache exists and is fresh
      mockBundleStorage.hasItem.mockResolvedValue(true)
      mockBundleStorage.getItem.mockResolvedValue({ timestamp: Date.now() })
      mockBundleStorage.getItemRaw.mockResolvedValue(cachedContent)

      const renderedScript = new Map()

      const code = await transform(
        `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
          bundle: true,
        })`,
        {
          renderedScript,
          cacheMaxAge: 24 * 60 * 60 * 1000, // 1 day
        },
      )

      expect(code).toMatchInlineSnapshot(`"const instance = useScript('/_scripts/beacon.min.js', )"`)

      // Verify fetch was not called (used cache)
      expect(fetch).not.toHaveBeenCalled()

      // Verify cache methods were called correctly
      expect(mockBundleStorage.hasItem).toHaveBeenCalledWith('bundle:beacon.min.js')
      expect(mockBundleStorage.getItem).toHaveBeenCalledWith('bundle-meta:beacon.min.js')
      expect(mockBundleStorage.getItemRaw).toHaveBeenCalledWith('bundle:beacon.min.js')

      // Verify the cached content was used (check both possible keys)
      const scriptEntry = renderedScript.get('https://static.cloudflareinsights.com/beacon.min.js')
        || renderedScript.get('/_scripts/beacon.min.js')
      expect(scriptEntry).toBeDefined()
      expect(scriptEntry?.content).toBe(cachedContent)
      expect(scriptEntry?.size).toBe(cachedContent.length / 1024)
    })
  })

  it('registry config is passed to scriptBundling functions - no function arguments', async () => {
    vi.mocked(hash).mockImplementationOnce(src => src.pathname)
    const code = await transform(
      `const instance = useScriptGoogleTagManager()`,
      {
        defaultBundle: true,
        registryConfig: {
          googleTagManager: {
            id: 'GTM-REGISTRY-CONFIG',
          },
        },
        scripts: [
          {
            scriptBundling(options: any) {
              if (!options?.id) {
                return false
              }
              return `https://www.googletagmanager.com/gtm.js?id=${options.id}`
            },
            import: {
              name: 'useScriptGoogleTagManager',
              from: '',
            },
          },
        ],
      },
    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScriptGoogleTagManager({ scriptInput: { src: '/_scripts/gtm.js.js' } })()"`)
  })

  describe('configuration merging', () => {
    it('supports both scripts.registry and runtimeConfig.public.scripts - runtime config takes precedence', async () => {
      vi.mocked(hash).mockImplementationOnce(src => src.pathname)
      const code = await transform(
        `const instance = useScriptGoogleTagManager()`,
        {
          defaultBundle: true,
          // This simulates the merged config where runtimeConfig.public.scripts overrides scripts.registry
          registryConfig: {
            googleTagManager: {
              id: 'GTM-FROM-RUNTIME-CONFIG', // This should take precedence
              debug: false, // This comes from registry config
            },
          },
          scripts: [
            {
              scriptBundling(options: any) {
                if (!options?.id) {
                  return false
                }
                const url = new URL('https://www.googletagmanager.com/gtm.js')
                url.searchParams.set('id', options.id)
                if (options.debug) {
                  url.searchParams.set('debug', '1')
                }
                return url.toString()
              },
              import: {
                name: 'useScriptGoogleTagManager',
                from: '',
              },
            },
          ],
        },
      )
      expect(code).toMatchInlineSnapshot(`"const instance = useScriptGoogleTagManager({ scriptInput: { src: '/_scripts/gtm.js.js' } })()"`)
    })

    it('merges multiple properties from registry config', async () => {
      vi.mocked(hash).mockImplementationOnce(src => src.pathname)
      const code = await transform(
        `const instance = useScriptGoogleTagManager()`,
        {
          defaultBundle: true,
          registryConfig: {
            googleTagManager: {
              id: 'GTM-CONFIG-ID',
              debug: true,
              l: 'dataLayer',
              auth: 'auth-token',
            },
          },
          scripts: [
            {
              scriptBundling(options: any) {
                if (!options?.id) {
                  return false
                }
                const url = new URL('https://www.googletagmanager.com/gtm.js')
                url.searchParams.set('id', options.id)
                if (options.l) url.searchParams.set('l', options.l)
                if (options.auth) url.searchParams.set('gtm_auth', options.auth)
                if (options.debug) url.searchParams.set('gtm_debug', 'x')
                return url.toString()
              },
              import: {
                name: 'useScriptGoogleTagManager',
                from: '',
              },
            },
          ],
        },
      )
      expect(code).toMatchInlineSnapshot(`"const instance = useScriptGoogleTagManager({ scriptInput: { src: '/_scripts/gtm.js.js' } })()"`)
    })

    it('function arguments override merged registry config', async () => {
      vi.mocked(hash).mockImplementationOnce(src => src.pathname)
      const code = await transform(
        `const instance = useScriptGoogleTagManager({ id: 'GTM-FUNCTION-OVERRIDE', customParam: 'test' })`,
        {
          defaultBundle: true,
          registryConfig: {
            googleTagManager: {
              id: 'GTM-CONFIG-ID',
              debug: true,
              l: 'dataLayer',
            },
          },
          scripts: [
            {
              scriptBundling(options: any) {
                if (!options?.id) {
                  return false
                }
                const url = new URL('https://www.googletagmanager.com/gtm.js')
                url.searchParams.set('id', options.id)
                if (options.l) url.searchParams.set('l', options.l)
                if (options.debug) url.searchParams.set('gtm_debug', 'x')
                if (options.customParam) url.searchParams.set('custom', options.customParam)
                return url.toString()
              },
              import: {
                name: 'useScriptGoogleTagManager',
                from: '',
              },
            },
          ],
        },
      )
      // Function args take precedence: id from function, debug and l from registry
      expect(code).toMatchInlineSnapshot(`"const instance = useScriptGoogleTagManager({ scriptInput: { src: '/_scripts/gtm.js.js' },  id: 'GTM-FUNCTION-OVERRIDE', customParam: 'test' })"`)
    })

    it('works with empty registry config', async () => {
      const code = await transform(
        `const instance = useScriptGoogleTagManager()`,
        {
          defaultBundle: true,
          registryConfig: {}, // Empty registry config
          scripts: [
            {
              scriptBundling(options: any) {
                if (!options?.id) {
                  return false // Should return false since no id provided
                }
                return `https://www.googletagmanager.com/gtm.js?id=${options.id}`
              },
              import: {
                name: 'useScriptGoogleTagManager',
                from: '',
              },
            },
          ],
        },
      )
      // Should not transform since scriptBundling returns false
      expect(code).toBeUndefined()
    })

    it('works with undefined registry config', async () => {
      const code = await transform(
        `const instance = useScriptGoogleTagManager()`,
        {
          defaultBundle: true,
          registryConfig: undefined, // No registry config
          scripts: [
            {
              scriptBundling(options: any) {
                if (!options?.id) {
                  return false // Should return false since no id provided
                }
                return `https://www.googletagmanager.com/gtm.js?id=${options.id}`
              },
              import: {
                name: 'useScriptGoogleTagManager',
                from: '',
              },
            },
          ],
        },
      )
      // Should not transform since scriptBundling returns false
      expect(code).toBeUndefined()
    })

    it('handles nested registry config properly', async () => {
      vi.mocked(hash).mockImplementationOnce(src => src.pathname)
      const code = await transform(
        `const instance = useScriptGoogleAnalytics()`,
        {
          defaultBundle: true,
          registryConfig: {
            googleAnalytics: {
              id: 'GA-CONFIG-ID',
              config: {
                send_page_view: false,
                custom_map: { custom_parameter_1: 'dimension1' },
              },
            },
            // Also test that other configs don't interfere
            googleTagManager: {
              id: 'GTM-OTHER-ID',
            },
          },
          scripts: [
            {
              scriptBundling(options: any) {
                if (!options?.id) {
                  return false
                }
                const url = new URL('https://www.googletagmanager.com/gtag/js')
                url.searchParams.set('id', options.id)
                return url.toString()
              },
              import: {
                name: 'useScriptGoogleAnalytics',
                from: '',
              },
            },
          ],
        },
      )
      expect(code).toMatchInlineSnapshot(`"const instance = useScriptGoogleAnalytics({ scriptInput: { src: '/_scripts/gtag/js.js' } })()"`)
    })
  })

  it('registry config merges with function arguments - function args take precedence', async () => {
    vi.mocked(hash).mockImplementationOnce(src => src.pathname)
    const code = await transform(
      `const instance = useScriptGoogleTagManager({ id: 'GTM-FUNCTION-ARG' })`,
      {
        defaultBundle: true,
        registryConfig: {
          googleTagManager: {
            id: 'GTM-REGISTRY-CONFIG',
            debug: true,
          },
        },
        scripts: [
          {
            scriptBundling(options: any) {
              if (!options?.id) {
                return false
              }
              const url = new URL('https://www.googletagmanager.com/gtm.js')
              url.searchParams.set('id', options.id)
              if (options.debug) {
                url.searchParams.set('debug', '1')
              }
              return url.toString()
            },
            import: {
              name: 'useScriptGoogleTagManager',
              from: '',
            },
          },
        ],
      },
    )
    expect(code).toMatchInlineSnapshot(`"const instance = useScriptGoogleTagManager({ scriptInput: { src: '/_scripts/gtm.js.js' },  id: 'GTM-FUNCTION-ARG' })"`)
  })

  describe('integrity', () => {
    beforeEach(() => {
      mockBundleStorage.getItem.mockReset()
      mockBundleStorage.setItem.mockReset()
      mockBundleStorage.getItemRaw.mockReset()
      mockBundleStorage.setItemRaw.mockReset()
      mockBundleStorage.hasItem.mockReset()
      vi.clearAllMocks()
    })

    it('injects integrity attribute for useScript(string) pattern', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')
      mockBundleStorage.hasItem.mockResolvedValue(false)

      const scriptContent = Buffer.from('console.log("test")')
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(scriptContent),
        headers: { get: () => null },
        _data: scriptContent,
      } as any)

      const code = await transform(
        `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
          bundle: true,
        })`,
        {
          integrity: true,
          renderedScript: new Map(),
        },
      )

      // Should convert to object form with integrity and crossorigin
      expect(code).toContain('integrity:')
      expect(code).toContain('sha384-')
      expect(code).toContain(`crossorigin: 'anonymous'`)
    })

    it('injects integrity attribute for useScript({ src }) pattern', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')
      mockBundleStorage.hasItem.mockResolvedValue(false)

      const scriptContent = Buffer.from('console.log("test")')
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(scriptContent),
        headers: { get: () => null },
        _data: scriptContent,
      } as any)

      const code = await transform(
        `const instance = useScript({ src: 'https://static.cloudflareinsights.com/beacon.min.js' }, {
          bundle: true,
        })`,
        {
          integrity: true,
          renderedScript: new Map(),
        },
      )

      expect(code).toContain('integrity:')
      expect(code).toContain('sha384-')
      expect(code).toContain(`crossorigin: 'anonymous'`)
    })

    it('injects integrity for registry scripts via scriptInput', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'gtag')
      mockBundleStorage.hasItem.mockResolvedValue(false)

      const scriptContent = Buffer.from('console.log("analytics")')
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(scriptContent),
        headers: { get: () => null },
        _data: scriptContent,
      } as any)

      const code = await transform(
        `const instance = useScriptGoogleAnalytics({ id: 'GA-123' }, { bundle: true })`,
        {
          integrity: true,
          renderedScript: new Map(),
          scripts: [
            {
              scriptBundling() {
                return 'https://www.googletagmanager.com/gtag/js'
              },
              import: {
                name: 'useScriptGoogleAnalytics',
                from: '',
              },
            },
          ],
        },
      )

      expect(code).toContain('scriptInput:')
      expect(code).toContain('integrity:')
      expect(code).toContain('sha384-')
      expect(code).toContain(`crossorigin: 'anonymous'`)
    })

    it('supports sha256 algorithm', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')
      mockBundleStorage.hasItem.mockResolvedValue(false)

      const scriptContent = Buffer.from('console.log("test")')
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(scriptContent),
        headers: { get: () => null },
        _data: scriptContent,
      } as any)

      const code = await transform(
        `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
          bundle: true,
        })`,
        {
          integrity: 'sha256',
          renderedScript: new Map(),
        },
      )

      expect(code).toContain('sha256-')
    })

    it('supports sha512 algorithm', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')
      mockBundleStorage.hasItem.mockResolvedValue(false)

      const scriptContent = Buffer.from('console.log("test")')
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(scriptContent),
        headers: { get: () => null },
        _data: scriptContent,
      } as any)

      const code = await transform(
        `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
          bundle: true,
        })`,
        {
          integrity: 'sha512',
          renderedScript: new Map(),
        },
      )

      expect(code).toContain('sha512-')
    })

    it('does not inject integrity when disabled', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')
      mockBundleStorage.hasItem.mockResolvedValue(false)

      const scriptContent = Buffer.from('console.log("test")')
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(scriptContent),
        headers: { get: () => null },
        _data: scriptContent,
      } as any)

      const code = await transform(
        `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
          bundle: true,
        })`,
        {
          integrity: false,
          renderedScript: new Map(),
        },
      )

      expect(code).not.toContain('integrity:')
      expect(code).not.toContain('crossorigin:')
    })

    it('loads cached integrity hash', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')

      const cachedContent = Buffer.from('cached script content')
      const cachedIntegrity = 'sha384-cachedHashValue'

      mockBundleStorage.hasItem.mockResolvedValue(true)
      mockBundleStorage.getItem.mockResolvedValue({
        timestamp: Date.now(),
        integrity: cachedIntegrity,
      })
      mockBundleStorage.getItemRaw.mockResolvedValue(cachedContent)

      const code = await transform(
        `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
          bundle: true,
        })`,
        {
          integrity: true,
          renderedScript: new Map(),
        },
      )

      expect(code).toContain(cachedIntegrity)
    })

    it('stores integrity hash in metadata', async () => {
      vi.mocked(hash).mockImplementationOnce(() => 'beacon.min')
      mockBundleStorage.hasItem.mockResolvedValue(false)

      const scriptContent = Buffer.from('console.log("test")')
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(scriptContent),
        headers: { get: () => null },
        _data: scriptContent,
      } as any)

      await transform(
        `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
          bundle: true,
        })`,
        {
          integrity: true,
          renderedScript: new Map(),
        },
      )

      const metadataCall = mockBundleStorage.setItem.mock.calls.find(call =>
        call[0].startsWith('bundle-meta:'),
      )
      expect(metadataCall).toBeDefined()
      expect(metadataCall[1].integrity).toBeDefined()
      expect(metadataCall[1].integrity).toMatch(/^sha384-/)
    })
  })

  describe.todo('fallbackOnSrcOnBundleFail', () => {
    beforeEach(() => {
      vi.mocked($fetch).mockImplementationOnce(() => Promise.reject(new Error('fetch error')))
    })

    const scripts = [{
      label: 'NPM',
      scriptBundling() {
        return 'bundle.js'
      },
      logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path fill="#C12127" d="M0 256V0h256v256z"/><path fill="#FFF" d="M48 48h160v160h-32V80h-48v128H48z"/></svg>`,
      category: 'utility',
      import: {
        name: 'useScriptNpm',
        // key is based on package name
        from: 'somewhere',
      },
    }]
    it('should throw error if bundle fails and fallbackOnSrcOnBundleFail is false', async () => {
      await expect(async () => await transform(`const instance = useScriptNpm({
  packageName: 'js-confetti',
  file: 'dist/js-confetti.browser.js',
  version: '0.15.0',
  scriptOptions: {
    bundle: true
  },
})`, { fallbackOnSrcOnBundleFail: false, scripts })).rejects.toThrow(`Failed to fetch`)
    })

    it('should not throw error if bundle fails and fallbackOnSrcOnBundleFail is true', async () => {
      vi.mocked(hash).mockImplementationOnce(src => ohash(src.pathname))

      vi.mocked(fetch).mockImplementationOnce(() => Promise.reject(new Error('fetch error')))

      const code = await transform(`const instance = useScriptNpm({
  packageName: 'js-confetti',
  file: 'dist/js-confetti.browser.js',
  version: '0.12.0',
  scriptOptions: {
    trigger: useScriptTriggerElement({ trigger: 'mouseover', el: mouseOverEl }),
    use() {
      return { JSConfetti: window.JSConfetti }
    },
    bundle: true
  },
})`, { fallbackOnSrcOnBundleFail: true, scripts })
      expect(code).toMatchInlineSnapshot(`
        "const instance = useScriptNpm({ scriptInput: { src: '/_scripts/U6Ua8p1giF.js' },
          packageName: 'js-confetti',
          file: 'dist/js-confetti.browser.js',
          version: '0.12.0',
          scriptOptions: {
            trigger: useScriptTriggerElement({ trigger: 'mouseover', el: mouseOverEl }),
            use() {
              return { JSConfetti: window.JSConfetti }
            },
            bundle: true
          },
        })"
      `)
      expect(code).toContain('bundle.js')
    })
  })
})
