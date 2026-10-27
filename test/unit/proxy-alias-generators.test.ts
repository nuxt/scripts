import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { resolveConfiguredProxyDomains } from '../../packages/script/src/module'
import { generateInterceptPluginContents } from '../../packages/script/src/plugins/intercept'
import { buildProxyConfigsFromRegistry, generatePartytownResolveUrl, registry } from '../../packages/script/src/registry'

const ALIASES = { 'us.i.posthog.com': 'ph' }

/** Runs the generated intercept plugin on `https://my-site.test` and returns the URLs it hands to native fetch. */
async function fetchThroughIntercept(proxyPrefix: string, urls: string[]): Promise<unknown[]> {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response())
  const generated = generateInterceptPluginContents(proxyPrefix)
    .replace('import { defineNuxtPlugin } from \'nuxt/app\'\n\n', '')
    .replace('export default ', '')
  const sandbox = {
    defineNuxtPlugin: (plugin: { setup: () => void }) => plugin,
    navigator: { sendBeacon: vi.fn() },
    location: { origin: 'https://my-site.test' },
    XMLHttpRequest: class { open() {} },
    Image: class {},
    HTMLImageElement: class {},
    Request: globalThis.Request,
    URL,
    fetch: globalThis.fetch,
    __nuxtScripts: undefined as { fetch: (url: string) => Promise<Response> } | undefined,
  }

  try {
    const plugin = runInNewContext(generated, sandbox) as { setup: () => void }
    plugin.setup()
    for (const url of urls)
      await sandbox.__nuxtScripts!.fetch(url)
    return fetchSpy.mock.calls.map(([url]) => url)
  }
  finally {
    fetchSpy.mockRestore()
  }
}

function evaluateResolveUrl(source: string) {
  return runInNewContext(`(${source})`, { URL }) as (
    url: URL,
    location: URL,
  ) => URL | undefined
}

describe('proxy alias - generated runtime code (#814)', () => {
  describe('generatePartytownResolveUrl', () => {
    it('rewrites a third-party host to its alias', () => {
      const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p', ALIASES, ['us.i.posthog.com']))
      const out = resolveUrl(
        new URL('https://us.i.posthog.com/e/?x=1'),
        new URL('https://my-site.test/'),
      )
      expect(out.pathname).toBe('/_scripts/p/ph/e/')
      expect(out.href).not.toContain('posthog')
    })

    it('falls back to the verbatim host when no alias is configured', () => {
      const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p', {}, ['eu.i.posthog.com']))
      const out = resolveUrl(
        new URL('https://eu.i.posthog.com/e/'),
        new URL('https://my-site.test/'),
      )
      expect(out.pathname).toBe('/_scripts/p/eu.i.posthog.com/e/')
    })

    it.each(['constructor', 'toString', '__proto__'])(
      'treats inherited property name %s as an unaliased host',
      (host) => {
        const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p', {}, [new URL(`https://${host}`).hostname]))
        const out = resolveUrl(
          new URL(`https://${host}/collect`),
          new URL('https://my-site.test/'),
        )

        expect(out.pathname).toBe(`/_scripts/p/${new URL(`https://${host}`).hostname}/collect`)
      },
    )

    it.each([
      'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=test',
      'https://analytics.us.tiktok.com/api/v2/pixel',
      'https://mon.tiktok.com/monitor',
      'https://example.com/unconfigured.js',
    ])('leaves unconfigured vendor requests remote: %s', (src) => {
      const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p', {}, ['www.google-analytics.com']))
      expect(resolveUrl(new URL(src), new URL('https://my-site.test/'))).toBeUndefined()
    })

    it.each([
      ['https://a.clarity.ms/collect', '*.clarity.ms'],
      ['https://www.google.co.jp/collect', 'www.google.*'],
      ['https://sub.example.com/collect', 'example.com'],
    ])('routes supported wildcard or subdomain requests: %s', (src, domain) => {
      const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p', {}, [domain]))
      expect(resolveUrl(new URL(src), new URL('https://my-site.test/'))?.pathname)
        .toBe(`/_scripts/p/${new URL(src).host}/collect`)
    })

    it('keeps Google visitor loaders remote while proxying collection requests', async () => {
      const configs = buildProxyConfigsFromRegistry(await registry())
      const configuredDomains = resolveConfiguredProxyDomains({
        scriptInput: { src: 'https://www.googletagmanager.com/gtag/js?id=G-TEST' },
      }, configs.googleAnalytics)
      const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p', {}, [...configs.googleAnalytics!.domains, ...configuredDomains]))
      const location = new URL('https://my-site.test/')

      expect(resolveUrl(new URL('https://www.googletagmanager.com/gtag/js?id=G-TEST'), location)).toBeUndefined()
      expect(resolveUrl(new URL('https://www.googletagmanager.com/gtm.js?id=GTM-TEST'), location)).toBeUndefined()
      expect(resolveUrl(new URL('https://www.google-analytics.com/g/collect?v=2'), location)?.pathname)
        .toBe('/_scripts/p/www.google-analytics.com/g/collect')
    })

    it('leaves non-HTTP protocols unresolved', () => {
      const resolveUrl = evaluateResolveUrl(generatePartytownResolveUrl('/_scripts/p', {}, []))

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
      expect(await fetchThroughIntercept('/_scripts/p', [
        'data:text/plain,hello',
        'javascript:void(0)',
        'https://my-site.test/collect',
        'https://constructor/collect',
      ])).toEqual([
        'data:text/plain,hello',
        'javascript:void(0)',
        'https://my-site.test/collect',
        'https://my-site.test/_scripts/p/constructor/collect',
      ])
    })

    it('routes vendor URLs to an absolute proxy origin', async () => {
      expect(await fetchThroughIntercept('https://t.example.test/_scripts/p', [
        'https://www.google-analytics.com/g/collect?v=2',
        'https://t.example.test/_scripts/p/www.google-analytics.com/g/collect?v=2',
        'https://my-site.test/collect',
      ])).toEqual([
        'https://t.example.test/_scripts/p/www.google-analytics.com/g/collect?v=2',
        'https://t.example.test/_scripts/p/www.google-analytics.com/g/collect?v=2',
        'https://my-site.test/collect',
      ])
    })

    it('keeps relative proxy URLs on the page origin', async () => {
      expect(await fetchThroughIntercept('/_scripts/p', [
        'https://www.google-analytics.com/g/collect?v=2',
        '/_scripts/p/www.google-analytics.com/g/collect',
      ])).toEqual([
        'https://my-site.test/_scripts/p/www.google-analytics.com/g/collect?v=2',
        '/_scripts/p/www.google-analytics.com/g/collect',
      ])
    })
  })
})
