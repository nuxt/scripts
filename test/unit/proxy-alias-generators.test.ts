import { describe, expect, it } from 'vitest'
import { generateInterceptPluginContents } from '../../packages/script/src/plugins/intercept'
import { generatePartytownResolveUrl } from '../../packages/script/src/registry'

const ALIASES = { 'us.i.posthog.com': 'ph' }

describe('proxy alias - generated runtime code (#814)', () => {
  describe('generatePartytownResolveUrl', () => {
    it('rewrites a third-party host to its alias', () => {
      // eslint-disable-next-line no-eval
      const resolveUrl = eval(`(${generatePartytownResolveUrl('/_scripts/p', ALIASES)})`)
      const out = resolveUrl(
        new URL('https://us.i.posthog.com/e/?x=1'),
        new URL('https://my-site.test/'),
      )
      expect(out.pathname).toBe('/_scripts/p/ph/e/')
      expect(out.href).not.toContain('posthog')
    })

    it('falls back to the verbatim host when no alias is configured', () => {
      // eslint-disable-next-line no-eval
      const resolveUrl = eval(`(${generatePartytownResolveUrl('/_scripts/p')})`)
      const out = resolveUrl(
        new URL('https://eu.i.posthog.com/e/'),
        new URL('https://my-site.test/'),
      )
      expect(out.pathname).toBe('/_scripts/p/eu.i.posthog.com/e/')
    })
  })

  describe('generateInterceptPluginContents', () => {
    it('embeds the alias map into the client intercept plugin', () => {
      const code = generateInterceptPluginContents('/_scripts/p', { domainAliases: ALIASES })
      expect(code).toContain('const domainAliases = {"us.i.posthog.com":"ph"}')
      expect(code).toContain('domainAliases[parsed.host] || parsed.host')
    })

    it('defaults to an empty alias map', () => {
      const code = generateInterceptPluginContents('/_scripts/p')
      expect(code).toContain('const domainAliases = {}')
    })
  })
})
