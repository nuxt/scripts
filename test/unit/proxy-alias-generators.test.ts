import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { generateInterceptPluginContents } from '../../packages/script/src/plugins/intercept'
import { generatePartytownResolveUrl } from '../../packages/script/src/registry'

const ALIASES = { 'us.i.posthog.com': 'ph' }

function evaluateResolveUrl(source: string) {
  return runInNewContext(`(${source})`, { URL }) as (
    url: URL,
    location: URL,
  ) => URL | undefined
}

describe('proxy alias - generated runtime code (#814)', () => {
  describe('generatePartytownResolveUrl', () => {
    it('rewrites a third-party host to its alias', () => {
      const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p', ALIASES))
      const out = resolveUrl(
        new URL('https://us.i.posthog.com/e/?x=1'),
        new URL('https://my-site.test/'),
      )
      expect(out.pathname).toBe('/_scripts/p/ph/e/')
      expect(out.href).not.toContain('posthog')
    })

    it('falls back to the verbatim host when no alias is configured', () => {
      const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p'))
      const out = resolveUrl(
        new URL('https://eu.i.posthog.com/e/'),
        new URL('https://my-site.test/'),
      )
      expect(out.pathname).toBe('/_scripts/p/eu.i.posthog.com/e/')
    })

    it.each(['constructor', 'toString', '__proto__'])(
      'treats inherited property name %s as an unaliased host',
      (host) => {
        const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p'))
        const out = resolveUrl(
          new URL(`https://${host}/collect`),
          new URL('https://my-site.test/'),
        )

        expect(out.pathname).toBe(`/_scripts/p/${new URL(`https://${host}`).hostname}/collect`)
      },
    )

    it('leaves non-HTTP protocols unresolved', () => {
      const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p'))

      expect(resolveUrl(new URL('data:text/plain,hello'), new URL('https://my-site.test/'))).toBeUndefined()
    })
  })

  describe('generateInterceptPluginContents', () => {
    it('imports defineNuxtPlugin when Nuxt auto imports are disabled (#841)', () => {
      const code = generateInterceptPluginContents('/_scripts/p')
      expect(code).toContain('import { defineNuxtPlugin } from \'nuxt/app\'')
    })

    it('embeds the alias map into the client intercept plugin', () => {
      const code = generateInterceptPluginContents('/_scripts/p', { domainAliases: ALIASES })
      expect(code).toContain('const domainAliases = Object.assign(Object.create(null), {"us.i.posthog.com":"ph"})')
      expect(code).toContain('domainAliases[parsed.host] || parsed.host')
      expect(code).toContain('parsed.protocol === \'http:\' || parsed.protocol === \'https:\'')
    })

    it('defaults to an empty alias map', () => {
      const code = generateInterceptPluginContents('/_scripts/p')
      expect(code).toContain('const domainAliases = Object.assign(Object.create(null), {})')
    })

    it('leaves non-HTTP and same-origin URLs unchanged at runtime', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response())
      const defineNuxtPlugin = (plugin: { setup: () => void }) => plugin
      const navigator = { sendBeacon: vi.fn() }
      const location = { origin: 'https://my-site.test' }
      const XMLHttpRequest = class { open() {} }
      const Image = class {}
      const HTMLImageElement = class {}
      const Request = globalThis.Request
      const generated = generateInterceptPluginContents('/_scripts/p').replace('export default ', '')
      const sandbox = {
        defineNuxtPlugin,
        navigator,
        location,
        XMLHttpRequest,
        Image,
        HTMLImageElement,
        Request,
        URL,
        fetch: globalThis.fetch,
        __nuxtScripts: undefined as { fetch: (url: string) => Promise<Response> } | undefined,
      }

      try {
        const plugin = runInNewContext(generated, sandbox) as { setup: () => void }
        plugin.setup()
        const runtime = sandbox.__nuxtScripts!

        await runtime.fetch('data:text/plain,hello')
        await runtime.fetch('javascript:void(0)')
        await runtime.fetch('https://my-site.test/collect')
        await runtime.fetch('https://constructor/collect')

        expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
          'data:text/plain,hello',
          'javascript:void(0)',
          'https://my-site.test/collect',
          'https://my-site.test/_scripts/p/constructor/collect',
        ])
      }
      finally {
        fetchSpy.mockRestore()
      }
    })
  })
})
