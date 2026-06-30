import { describe, expect, it } from 'vitest'
import { aliasForDomain, aliasProxyValue, buildDomainAliasMap, invertAliasMap } from '../../packages/script/src/proxy-alias'

describe('proxy-alias', () => {
  describe('aliasForDomain', () => {
    it('returns undefined when aliasing is disabled', () => {
      expect(aliasForDomain('us.i.posthog.com', false)).toBeUndefined()
      expect(aliasForDomain('us.i.posthog.com', undefined)).toBeUndefined()
    })

    it('auto-generates a short deterministic hash for true', () => {
      const a = aliasForDomain('us.i.posthog.com', true)
      const b = aliasForDomain('us.i.posthog.com', true)
      expect(a).toBe(b)
      expect(a).toMatch(/^[a-f0-9]{12}$/)
      // hostname is never present verbatim
      expect(a).not.toContain('posthog')
    })

    it('does not resolve inherited prototype members for an explicit map', () => {
      expect(aliasForDomain('toString', { 'us.i.posthog.com': 'ph' })).toBeUndefined()
      expect(aliasForDomain('constructor', { 'us.i.posthog.com': 'ph' })).toBeUndefined()
    })

    it('produces distinct aliases for distinct domains', () => {
      expect(aliasForDomain('us.i.posthog.com', true)).not.toBe(aliasForDomain('eu.i.posthog.com', true))
    })

    it('uses an explicit alias when configured', () => {
      expect(aliasForDomain('us.i.posthog.com', { 'us.i.posthog.com': 'ph' })).toBe('ph')
    })

    it('returns undefined for domains not in an explicit map', () => {
      expect(aliasForDomain('eu.i.posthog.com', { 'us.i.posthog.com': 'ph' })).toBeUndefined()
    })

    it('skips wildcard domains (no literal path form)', () => {
      expect(aliasForDomain('*.posthog.com', true)).toBeUndefined()
    })
  })

  describe('buildDomainAliasMap', () => {
    it('maps each domain to its alias', () => {
      const map = buildDomainAliasMap(['us.i.posthog.com', 'eu.i.posthog.com'], { 'us.i.posthog.com': 'ph' })
      expect(map).toEqual({ 'us.i.posthog.com': 'ph' })
    })

    it('auto-aliases every non-wildcard domain', () => {
      const map = buildDomainAliasMap(['a.example.com', '*.example.com'], true)
      expect(Object.keys(map)).toEqual(['a.example.com'])
    })
  })

  describe('invertAliasMap', () => {
    it('inverts domain → alias into alias → domain', () => {
      expect(invertAliasMap({ 'us.i.posthog.com': 'ph' })).toEqual({ ph: 'us.i.posthog.com' })
    })
  })

  describe('aliasProxyValue', () => {
    const alias = { 'us.i.posthog.com': 'ph' }

    it('rewrites the host segment of a proxy path', () => {
      expect(aliasProxyValue('/_scripts/p/us.i.posthog.com', '/_scripts/p', alias)).toBe('/_scripts/p/ph')
      expect(aliasProxyValue('/_scripts/p/us.i.posthog.com/e/?x=1', '/_scripts/p', alias)).toBe('/_scripts/p/ph/e/?x=1')
    })

    it('leaves unaliased domains untouched', () => {
      expect(aliasProxyValue('/_scripts/p/eu.i.posthog.com/e', '/_scripts/p', alias)).toBe('/_scripts/p/eu.i.posthog.com/e')
    })

    it('is a no-op when aliasing is disabled or path is not a proxy path', () => {
      expect(aliasProxyValue('/_scripts/p/us.i.posthog.com', '/_scripts/p', false)).toBe('/_scripts/p/us.i.posthog.com')
      expect(aliasProxyValue('https://us.i.posthog.com', '/_scripts/p', alias)).toBe('https://us.i.posthog.com')
    })
  })
})
