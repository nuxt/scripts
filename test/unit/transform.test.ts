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
