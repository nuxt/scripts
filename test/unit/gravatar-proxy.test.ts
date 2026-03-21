import { describe, expect, it } from 'vitest'
import { getAllProxyConfigs } from '../../src/first-party'

describe('gravatar proxy config', () => {
  it('returns proxy config for gravatar', () => {
    const config = getAllProxyConfigs('/_scripts/c').gravatar
    expect(config).toBeDefined()
    expect(config?.domains).toBeDefined()
    expect(config?.privacy).toBeDefined()
  })

  it('has correct domains', () => {
    const config = getAllProxyConfigs('/_scripts/c').gravatar
    expect(config?.domains).toContain('secure.gravatar.com')
    expect(config?.domains).toContain('gravatar.com')
  })

  it('uses IP_ONLY privacy', () => {
    const config = getAllProxyConfigs('/_scripts/c').gravatar
    expect(config?.privacy.ip).toBe(true)
    expect(config?.privacy.userAgent).toBe(false)
    expect(config?.privacy.language).toBe(false)
  })

  it('works with custom proxyPrefix', () => {
    const config = getAllProxyConfigs('/_custom/proxy').gravatar
    expect(config).toBeDefined()
    expect(config?.domains).toContain('secure.gravatar.com')
    expect(config?.domains).toContain('gravatar.com')
  })
})
