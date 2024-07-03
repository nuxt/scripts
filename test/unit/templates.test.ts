import { describe, it, expect } from 'vitest'
import { templatePlugin } from '../../src/templates'

describe('template plugin file', () => {
  // global
  it('empty global', async () => {
    const res = templatePlugin({
      globals: [],
      registry: {},
    }, [])
    expect(res).toMatchInlineSnapshot(`
      "import { useScript, defineNuxtPlugin } from '#imports'

      export default defineNuxtPlugin({
        name: "scripts:init",
        env: { islands: false },
        parallel: true,
        setup() {
        }
      })"
    `)
  })
  it('string global', async () => {
    const res = templatePlugin({
      globals: [
        'https://js.stripe.com/v3/',
      ],
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
          useScript("https://js.stripe.com/v3/")
          useScript({"async":true,"src":"https://js.stripe.com/v3/","key":"stripe","defer":true,"referrerpolicy":"no-referrer"})
          useScript("https://js.stripe.com/v3/", {"trigger":"onNuxtReady","mode":"client"} })
        }
      })"
    `)
  })
  // registry
  it('registry object', async () => {
    const res = templatePlugin({
      globals: [],
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
      globals: [],
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
