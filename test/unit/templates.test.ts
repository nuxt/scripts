import { describe, it, expect } from 'vitest'
import { templatePlugin, resolveTriggerForTemplate } from '../../src/templates'

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
          return { provide: { $scripts: {  } } }
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
    expect(res).toContain('const stripe = useScript({"src":"https://js.stripe.com/v3/","key":"stripe"}, { use: () => ({ stripe: window.stripe }) })')
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
    expect(res).toContain('const stripe = useScript({"key":"stripe","async":true,"src":"https://js.stripe.com/v3/","defer":true,"referrerpolicy":"no-referrer"}, { use: () => ({ stripe: window.stripe }) })')
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
    expect(res).toContain(' const stripe = useScript({"key":"stripe","async":true,"src":"https://js.stripe.com/v3/","defer":true,"referrerpolicy":"no-referrer"}, { ...{"trigger":"onNuxtReady","mode":"client"}, use: () => ({ stripe: window.stripe }) })')
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
      import { defineNuxtPlugin } from 'nuxt/app'

      export default defineNuxtPlugin({
        name: "scripts:init",
        env: { islands: false },
        parallel: true,
        setup() {
          const stripe1 = useScript({"src":"https://js.stripe.com/v3/","key":"stripe1"}, { use: () => ({ stripe1: window.stripe1 }) })
          const stripe2 = useScript({"key":"stripe","async":true,"src":"https://js.stripe.com/v3/","defer":true,"referrerpolicy":"no-referrer"}, { use: () => ({ stripe2: window.stripe2 }) })
          const stripe3 = useScript({"key":"stripe3","src":"https://js.stripe.com/v3/"}, { ...{"trigger":"onNuxtReady","mode":"client"}, use: () => ({ stripe3: window.stripe3 }) })
          return { provide: { $scripts: { stripe1, stripe2, stripe3 } } }
        }
      })"
    `)
  })
  // registry
  it('registry object', async () => {
    const res = templatePlugin({
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
    expect(res).toContain('useScriptStripe({"id":"test"})')
  })
  it('registry array', async () => {
    const res = templatePlugin({
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

  it('registry with partytown option', async () => {
    const res = templatePlugin({
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
    expect(res).toContain('useScriptGoogleAnalytics({"id":"G-XXXXX","scriptOptions":{"partytown":true}})')
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
    const res = templatePlugin({
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
