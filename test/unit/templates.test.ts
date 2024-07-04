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
    expect(res).toContain('useScript("https://js.stripe.com/v3/")')
  })
  it('object global', async () => {
    const res = templatePlugin({
      globals: [
        {
          async: true,
          src: 'https://js.stripe.com/v3/',
          key: 'stripe',
          defer: true,
          referrerpolicy: 'no-referrer',
        },
      ],
    }, [])
    expect(res).toContain('useScript({"async":true,"src":"https://js.stripe.com/v3/","key":"stripe","defer":true,"referrerpolicy":"no-referrer"})')
  })
  it('array global', async () => {
    const res = templatePlugin({
      globals: [
        [
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
      ],
    }, [])
    expect(res).toContain('useScript({"async":true,"src":"https://js.stripe.com/v3/","key":"stripe","defer":true,"referrerpolicy":"no-referrer"}, {"trigger":"onNuxtReady","mode":"client"} })')
  })
  it('mixing global', async () => {
    const res = templatePlugin({
      globals: [
        'https://js.stripe.com/v3/',
        {
          async: true,
          src: 'https://js.stripe.com/v3/',
          key: 'stripe',
          defer: true,
          referrerpolicy: 'no-referrer',
        },
        [
          'https://js.stripe.com/v3/',
          {
            trigger: 'onNuxtReady',
            mode: 'client',
          },
        ],
      ],
    }, [])
    expect(res).toMatchInlineSnapshot(`
      "import { useScript, defineNuxtPlugin } from '#imports'

      export default defineNuxtPlugin({
        name: "scripts:init",
        env: { islands: false },
        parallel: true,
        setup() {
          const 0 = useScript({"src":"https://js.stripe.com/v3/","key":"0"}, { use: () => ({ 0: window.0 }) })
          const 1 = useScript({"key":"stripe","async":true,"src":"https://js.stripe.com/v3/","defer":true,"referrerpolicy":"no-referrer"}, { use: () => ({ 1: window.1 }) })
          const 2 = useScript({"key":"2","src":"https://js.stripe.com/v3/"}, { ...{"trigger":"onNuxtReady","mode":"client"}, use: () => ({ 2: window.2 } }) )
          return { provide: { $scripts: { 0, 1, 2 } } }
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
