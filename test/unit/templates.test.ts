import { describe, expect, it } from 'vitest'
import { normalizeRegistryConfig } from '../../packages/script/src/normalize'
import { resolveTriggerForTemplate, templatePlugin } from '../../packages/script/src/templates'

/** Normalize registry config before passing to templatePlugin (mirrors module.ts behavior) */
function templatePluginNormalized(config: Parameters<typeof templatePlugin>[0], registry: Parameters<typeof templatePlugin>[1]) {
  if (config.registry)
    normalizeRegistryConfig(config.registry as Record<string, any>)
  return templatePlugin(config, registry)
}

describe('template plugin file', () => {
  // global
  it('empty global', async () => {
    const res = templatePlugin({
      globals: {},
      registry: {},
    }, [])
    expect(res).toMatchInlineSnapshot(`
      "import { useScript } from '#nuxt-scripts/composables/useScript'
      import { defineNuxtPlugin } from 'nuxt/app'

      export default defineNuxtPlugin({
        name: "scripts:init",
        env: { islands: false },
        parallel: true,
        setup() {
          return { provide: { scripts: {  } } }
        }
      })"
    `)
  })
  it('string global', async () => {
    const res = templatePlugin({
      globals: {
        stripe: 'https://js.stripe.com/v3/',
      },
    }, [])
    expect(res).toContain('"stripe": Object.assign({ key: "stripe" }, {"src":"https://js.stripe.com/v3/"}, __scriptsGlobals["stripe"] || {})')
    expect(res).toContain('const stripe = __registerGlobal(__globals["stripe"], { use: () => ({ stripe: window.stripe }) })')
  })
  it('object global', async () => {
    const res = templatePlugin({
      globals: {
        stripe: {
          async: true,
          src: 'https://js.stripe.com/v3/',
          key: 'stripe',
          defer: true,
          referrerpolicy: 'no-referrer',
        },
      },
    }, [])
    expect(res).toContain('"stripe": Object.assign({ key: "stripe" }, {"async":true,"src":"https://js.stripe.com/v3/","key":"stripe","defer":true,"referrerpolicy":"no-referrer"}, __scriptsGlobals["stripe"] || {})')
    expect(res).toContain('const stripe = __registerGlobal(__globals["stripe"], { use: () => ({ stripe: window.stripe }) })')
  })
  it('array global', async () => {
    const res = templatePlugin({
      globals: {
        stripe: [
          {
            async: true,
            src: 'https://js.stripe.com/v3/',
            key: 'stripe',
            defer: true,
            referrerpolicy: 'no-referrer',
          },
          {
            trigger: 'onNuxtReady',
            mode: 'client',
          },
        ],
      },
    }, [])
    expect(res).toContain('"stripe": Object.assign({ key: "stripe" }, {"async":true,"src":"https://js.stripe.com/v3/","key":"stripe","defer":true,"referrerpolicy":"no-referrer"}, __scriptsGlobals["stripe"] || {})')
    expect(res).toContain('const stripe = __registerGlobal(__globals["stripe"], { ...{"trigger":"onNuxtReady","mode":"client"}, use: () => ({ stripe: window.stripe }) })')
  })
  it('mixing global', async () => {
    const res = templatePlugin({
      globals: {
        stripe1: 'https://js.stripe.com/v3/',
        stripe2: {
          async: true,
          src: 'https://js.stripe.com/v3/',
          key: 'stripe',
          defer: true,
          referrerpolicy: 'no-referrer',
        },
        stripe3: [
          'https://js.stripe.com/v3/',
          {
            trigger: 'onNuxtReady',
            mode: 'client',
          },
        ],
      },
    }, [])
    expect(res).toMatchInlineSnapshot(`
      "import { useScript } from '#nuxt-scripts/composables/useScript'
      import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'

      export default defineNuxtPlugin({
        name: "scripts:init",
        env: { islands: false },
        parallel: true,
        async setup(nuxtApp) {
          const __scriptsGlobals = useRuntimeConfig().public.scriptsGlobals || {}
          const __registerGlobal = (input, options) => { const { enabled, ...rest } = input; return (enabled === false || rest.src === '' || rest.src === null) ? undefined : useScript(rest, options) }
          const __globals = {
            "stripe1": Object.assign({ key: "stripe1" }, {"src":"https://js.stripe.com/v3/"}, __scriptsGlobals["stripe1"] || {}),
            "stripe2": Object.assign({ key: "stripe2" }, {"async":true,"src":"https://js.stripe.com/v3/","key":"stripe","defer":true,"referrerpolicy":"no-referrer"}, __scriptsGlobals["stripe2"] || {}),
            "stripe3": Object.assign({ key: "stripe3" }, {"src":"https://js.stripe.com/v3/"}, __scriptsGlobals["stripe3"] || {}),
          }
          await nuxtApp.hooks.callHook('scripts:globals', __globals)
          const stripe1 = __registerGlobal(__globals["stripe1"], { use: () => ({ stripe1: window.stripe1 }) })
          const stripe2 = __registerGlobal(__globals["stripe2"], { use: () => ({ stripe2: window.stripe2 }) })
          const stripe3 = __registerGlobal(__globals["stripe3"], { ...{"trigger":"onNuxtReady","mode":"client"}, use: () => ({ stripe3: window.stripe3 }) })
          return { provide: { scripts: { stripe1, stripe2, stripe3 } } }
        }
      })"
    `)
  })
  // registry
  it('registry object without trigger (infrastructure only, no composable call)', async () => {
    const res = templatePluginNormalized({
      globals: {},
      registry: {
        stripe: {
          id: 'test',
        },
      },
    }, [
      {
        import: {
          name: 'useScriptStripe',
        },
      },
    ])
    expect(res).not.toContain('useScriptStripe')
  })
  it('registry object with trigger (auto-loads globally)', async () => {
    const res = templatePluginNormalized({
      globals: {},
      registry: {
        stripe: {
          id: 'test',
          trigger: 'onNuxtReady',
        },
      },
    }, [
      {
        import: {
          name: 'useScriptStripe',
        },
      },
    ])
    expect(res).toContain('useScriptStripe({"id":"test","scriptOptions":{"trigger":"onNuxtReady"}})')
  })
  it('registry array with trigger', async () => {
    const res = templatePluginNormalized({
      globals: {},
      registry: {
        stripe: [
          {
            id: 'test',
          },
          {
            trigger: 'onNuxtReady',
          },
        ],
      },
    }, [
      {
        import: {
          name: 'useScriptStripe',
        },
      },
    ])
    expect(res).toContain('useScriptStripe({"id":"test","scriptOptions":{"trigger":"onNuxtReady"}})')
  })

  it('registry with partytown but no trigger (no composable call)', async () => {
    const res = templatePluginNormalized({
      globals: {},
      registry: {
        googleAnalytics: [
          { id: 'G-XXXXX' },
          { partytown: true },
        ],
      },
    }, [
      {
        import: {
          name: 'useScriptGoogleAnalytics',
        },
      },
    ])
    expect(res).not.toContain('useScriptGoogleAnalytics')
  })

  it('registry with partytown and trigger', async () => {
    const res = templatePluginNormalized({
      globals: {},
      registry: {
        googleAnalytics: [
          { id: 'G-XXXXX' },
          { partytown: true, trigger: 'onNuxtReady' },
        ],
      },
    }, [
      {
        import: {
          name: 'useScriptGoogleAnalytics',
        },
      },
    ])
    expect(res).toContain('useScriptGoogleAnalytics({"id":"G-XXXXX","scriptOptions":{"partytown":true,"trigger":"onNuxtReady"}})')
  })

  // Test idleTimeout trigger in globals
  it('global with idleTimeout trigger', async () => {
    const res = templatePlugin({
      globals: {
        analytics: ['https://analytics.example.com/script.js', {
          trigger: { idleTimeout: 3000 },
        }],
      },
    }, [])
    expect(res).toContain('import { useScriptTriggerIdleTimeout }')
    expect(res).toContain('useScriptTriggerIdleTimeout({ timeout: 3000 })')
  })

  // Test interaction trigger in globals
  it('global with interaction trigger', async () => {
    const res = templatePlugin({
      globals: {
        chatWidget: ['https://chat.example.com/widget.js', {
          trigger: { interaction: ['scroll', 'click'] },
        }],
      },
    }, [])
    expect(res).toContain('import { useScriptTriggerInteraction }')
    expect(res).toContain('useScriptTriggerInteraction({ events: ["scroll","click"] })')
  })

  // Test registry with idleTimeout trigger
  it('registry with idleTimeout trigger', async () => {
    const res = templatePluginNormalized({
      registry: {
        googleAnalytics: [
          { id: 'GA_MEASUREMENT_ID' },
          { trigger: { idleTimeout: 5000 } },
        ],
      },
    }, [
      {
        import: {
          name: 'useScriptGoogleAnalytics',
        },
      },
    ])
    // Registry scripts now properly resolve triggers in templates
    expect(res).toContain('import { useScriptTriggerIdleTimeout }')
    expect(res).toContain('useScriptGoogleAnalytics({"id":"GA_MEASUREMENT_ID","scriptOptions":{"trigger":useScriptTriggerIdleTimeout({ timeout: 5000 })}})')
  })

  // Test both triggers together (should import both)
  it('mixed triggers import both composables', async () => {
    const res = templatePlugin({
      globals: {
        analytics: ['https://analytics.example.com/script.js', {
          trigger: { idleTimeout: 3000 },
        }],
        chat: ['https://chat.example.com/widget.js', {
          trigger: { interaction: ['scroll'] },
        }],
      },
    }, [])
    expect(res).toContain('import { useScriptTriggerIdleTimeout }')
    expect(res).toContain('import { useScriptTriggerInteraction }')
  })

  // Env-override merge: runtimeConfig globals[key] is the last arg to Object.assign,
  // so any field set via NUXT_PUBLIC_NUXT_SCRIPTS_GLOBALS_<KEY>_<FIELD> wins over
  // the build-time default. This is what makes single-build / multi-deploy work
  // (see https://github.com/nuxt/scripts/issues/759).
  it('global input is wrapped so runtimeConfig override wins', async () => {
    const res = templatePlugin({
      globals: {
        trustedShops: {
          src: 'https://widgets.trustedshops.com/build-time.js',
        },
      },
    }, [])
    // useRuntimeConfig is imported and resolved once.
    expect(res).toContain('import { defineNuxtPlugin, useRuntimeConfig } from \'nuxt/app\'')
    expect(res).toContain('const __scriptsGlobals = useRuntimeConfig().public.scriptsGlobals || {}')
    // Override slot is last → wins over the build-time JSON.
    expect(res).toContain('Object.assign({ key: "trustedShops" }, {"src":"https://widgets.trustedshops.com/build-time.js"}, __scriptsGlobals["trustedShops"] || {})')
  })

  // A runtime override can drop an unused integration per instance (multi-tenant single
  // build) by disabling it: `enabled: false` or an empty/null `src`. The generated plugin
  // routes every global through __registerGlobal which skips registration when disabled.
  // See https://github.com/nuxt/scripts/issues/759.
  it('global registration is guarded so a runtime override can disable it', async () => {
    const res = templatePlugin({
      globals: {
        awin: { src: 'https://www.dwin1.com/build-time.js' },
      },
    }, [])
    // Helper is emitted once and strips `enabled` so it never leaks as a script attribute.
    expect(res).toContain('const __registerGlobal = (input, options) => { const { enabled, ...rest } = input; return (enabled === false || rest.src === \'\' || rest.src === null) ? undefined : useScript(rest, options) }')
    // Each global goes through the guard rather than calling useScript directly.
    expect(res).toContain('const awin = __registerGlobal(__globals["awin"]')
    expect(res).not.toContain('const awin = useScript(')
  })

  // Resolved inputs are collected into a mutable map and passed through a runtime hook
  // before registration, so userland can rewrite/delete/add entries per instance.
  // See https://github.com/nuxt/scripts/issues/759.
  it('globals are passed through the scripts:globals runtime hook before registration', async () => {
    const res = templatePlugin({
      globals: {
        awin: { src: 'https://www.dwin1.com/build-time.js' },
      },
    }, [])
    // setup is async and receives nuxtApp so the hook can be awaited.
    expect(res).toContain('async setup(nuxtApp) {')
    // Resolved input lives in the mutable map keyed by the global key.
    expect(res).toContain('"awin": Object.assign({ key: "awin" }')
    // Hook fires before any registration, with the mutable map.
    expect(res).toContain('await nuxtApp.hooks.callHook(\'scripts:globals\', __globals)')
    const hookIdx = res.indexOf('callHook(\'scripts:globals\'')
    const registerIdx = res.indexOf('const awin = __registerGlobal')
    expect(hookIdx).toBeGreaterThan(-1)
    expect(registerIdx).toBeGreaterThan(hookIdx)
  })

  // The runtime guard itself: enabled:false and empty/null src skip; undefined src (non-src
  // globals) and a normal src register.
  it('__registerGlobal skips disabled entries and registers the rest', () => {
    const calls: any[] = []
    const useScript = (input: any) => {
      calls.push(input)
      return input
    }
    const __registerGlobal = (input: any, options: any) => {
      const { enabled, ...rest } = input
      return (enabled === false || rest.src === '' || rest.src === null) ? undefined : useScript(rest, options)
    }

    expect(__registerGlobal({ key: 'a', src: 'https://e/x.js' }, {})).toBeDefined()
    expect(__registerGlobal({ key: 'b', src: 'https://e/x.js', enabled: false }, {})).toBeUndefined()
    expect(__registerGlobal({ key: 'c', src: '' }, {})).toBeUndefined()
    expect(__registerGlobal({ key: 'd', src: null }, {})).toBeUndefined()
    // No src field (inline/non-src global) still registers.
    expect(__registerGlobal({ key: 'e' }, {})).toBeDefined()
    // `enabled` is stripped, never forwarded to useScript as an attribute.
    expect(calls.every(c => !('enabled' in c))).toBe(true)
  })

  // Test serviceWorker trigger in globals
  it('global with serviceWorker trigger', async () => {
    const res = templatePlugin({
      globals: {
        analytics: ['https://analytics.example.com/script.js', {
          trigger: { serviceWorker: true },
        }],
      },
    }, [])
    expect(res).toContain('import { useScriptTriggerServiceWorker }')
    expect(res).toContain('useScriptTriggerServiceWorker()')
  })
})

describe('resolveTriggerForTemplate', () => {
  it('should return null for non-object triggers', () => {
    expect(resolveTriggerForTemplate('onNuxtReady')).toBe(null)
    expect(resolveTriggerForTemplate(null)).toBe(null)
    expect(resolveTriggerForTemplate(undefined)).toBe(null)
    expect(resolveTriggerForTemplate(42)).toBe(null)
  })

  it('should handle idleTimeout trigger', () => {
    const result = resolveTriggerForTemplate({ idleTimeout: 5000 })
    expect(result).toBe('useScriptTriggerIdleTimeout({ timeout: 5000 })')
  })

  it('should handle interaction trigger', () => {
    const result = resolveTriggerForTemplate({ interaction: ['scroll', 'click'] })
    expect(result).toBe('useScriptTriggerInteraction({ events: ["scroll","click"] })')
  })

  it('should handle serviceWorker trigger', () => {
    const result = resolveTriggerForTemplate({ serviceWorker: true })
    expect(result).toBe('useScriptTriggerServiceWorker()')
  })

  it('should return null for unknown trigger types', () => {
    const result = resolveTriggerForTemplate({ unknownTrigger: 'value' })
    expect(result).toBe(null)
  })

  it('should throw error for multiple trigger properties', () => {
    expect(() => {
      resolveTriggerForTemplate({ idleTimeout: 3000, interaction: ['click'] })
    }).toThrow('Trigger object must have exactly one property, received: idleTimeout, interaction')
  })

  it('should throw error with correct property names', () => {
    expect(() => {
      resolveTriggerForTemplate({ idleTimeout: 3000, interaction: ['click'], someOther: 'value' })
    }).toThrow('Trigger object must have exactly one property, received: idleTimeout, interaction, someOther')
  })
})
