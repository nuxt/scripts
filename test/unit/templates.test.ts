import { describe, it, expect } from 'vitest'
import { templatePlugin } from '../../src/templates'

describe('template plugin file', () => {
  // global
  it('empty global', async () => {
    const res = templatePlugin({
      globals: {},
      registry: {},
    }, [])
    expect(res).toMatchInlineSnapshot(`
      "import { useScript, defineNuxtPlugin } from '#imports'

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
    expect(res).toContain('const stripe = useScript({"key":"stripe","async":true,"src":"https://js.stripe.com/v3/","defer":true,"referrerpolicy":"no-referrer"}, { ...{"trigger":"onNuxtReady","mode":"client"}, use: () => ({ stripe: window.stripe } }) )')
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
      "import { useScript, defineNuxtPlugin } from '#imports'

      export default defineNuxtPlugin({
        name: "scripts:init",
        env: { islands: false },
        parallel: true,
        setup() {
          const stripe1 = useScript({"src":"https://js.stripe.com/v3/","key":"stripe1"}, { use: () => ({ stripe1: window.stripe1 }) })
          const stripe2 = useScript({"key":"stripe","async":true,"src":"https://js.stripe.com/v3/","defer":true,"referrerpolicy":"no-referrer"}, { use: () => ({ stripe2: window.stripe2 }) })
          const stripe3 = useScript({"key":"stripe3","src":"https://js.stripe.com/v3/"}, { ...{"trigger":"onNuxtReady","mode":"client"}, use: () => ({ stripe3: window.stripe3 } }) )
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
    expect(res).toContain('useScriptStripe([{"id":"test"},{"trigger":"onNuxtReady"}])')
  })
})
