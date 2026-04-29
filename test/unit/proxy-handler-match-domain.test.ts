import { describe, expect, it } from 'vitest'
import { matchDomain } from '../../packages/script/src/runtime/server/utils/match-domain'

describe('matchDomain', () => {
  it('matches exact hostname', () => {
    expect(matchDomain('www.google-analytics.com', 'www.google-analytics.com')).toBe(true)
  })

  it('matches subdomain via parent pattern', () => {
    expect(matchDomain('mail.google.com', 'google.com')).toBe(true)
    expect(matchDomain('google.com', 'google.com')).toBe(true)
  })

  it('rejects non-matching hostname', () => {
    expect(matchDomain('evil.com', 'google.com')).toBe(false)
    expect(matchDomain('googleX.com', 'google.com')).toBe(false)
  })

  // Issue #728: ga-audiences fires to www.google.<cctld> based on geo
  it('matches geo-localized Google ccTLDs via wildcard', () => {
    expect(matchDomain('www.google.com', 'www.google.*')).toBe(true)
    expect(matchDomain('www.google.com.tw', 'www.google.*')).toBe(true)
    expect(matchDomain('www.google.co.jp', 'www.google.*')).toBe(true)
    expect(matchDomain('www.google.com.hk', 'www.google.*')).toBe(true)
  })

  it('wildcard does not match a different host root', () => {
    expect(matchDomain('evil.google.com', 'www.google.*')).toBe(false)
    expect(matchDomain('www.googleX.com', 'www.google.*')).toBe(false)
  })

  // Security: the wildcard must not match attacker-controlled subdomains.
  // Without a TLD shape constraint, `*` would match `attacker.com` here.
  it('wildcard rejects attacker-controlled suffixes', () => {
    expect(matchDomain('www.google.attacker.com', 'www.google.*')).toBe(false)
    expect(matchDomain('www.google.com.attacker.com', 'www.google.*')).toBe(false)
    expect(matchDomain('www.google.evil-domain.com', 'www.google.*')).toBe(false)
    // Three or more labels in the suffix → not a valid ccTLD shape
    expect(matchDomain('www.google.a.b.c', 'www.google.*')).toBe(false)
    // Two arbitrary 3-letter labels are not a real ccTLD shape; only com.<cc> / co.<cc> allowed
    expect(matchDomain('www.google.foo.bar', 'www.google.*')).toBe(false)
    expect(matchDomain('www.google.abc.xyz', 'www.google.*')).toBe(false)
  })

  it('escapes regex metachars in the pattern', () => {
    expect(matchDomain('foo.bar.com', 'foo+bar.com')).toBe(false)
    expect(matchDomain('foo+bar.com', 'foo+bar.com')).toBe(true)
  })
})
