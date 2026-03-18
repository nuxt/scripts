import { describe, expect, it } from 'vitest'
import { getAllProxyConfigs } from '../../src/first-party'

describe('gravatar proxy config', () => {
  it('returns proxy config for gravatar', () => {
    const config = getAllProxyConfigs('/_scripts/c').gravatar
    expect(config).toBeDefined()
    expect(config?.rewrite).toBeDefined()
    expect(config?.routes).toBeDefined()
  })

  it('rewrites secure.gravatar.com for hovercards JS', () => {
    const config = getAllProxyConfigs('/_scripts/c').gravatar
    expect(config?.rewrite).toContainEqual({
      from: 'secure.gravatar.com',
      to: '/_scripts/c/gravatar',
    })
  })

  it('rewrites gravatar.com/avatar for image proxying', () => {
    const config = getAllProxyConfigs('/_scripts/c').gravatar
    expect(config?.rewrite).toContainEqual({
      from: 'gravatar.com/avatar',
      to: '/_scripts/c/gravatar-avatar',
    })
  })

  it('routes proxy to correct targets', () => {
    const config = getAllProxyConfigs('/_scripts/c').gravatar
    expect(config?.routes?.['/_scripts/c/gravatar/**']).toEqual({
      proxy: 'https://secure.gravatar.com/**',
    })
    expect(config?.routes?.['/_scripts/c/gravatar-avatar/**']).toEqual({
      proxy: 'https://gravatar.com/avatar/**',
    })
  })

  it('uses custom collectPrefix', () => {
    const config = getAllProxyConfigs('/_custom/proxy').gravatar
    expect(config?.rewrite).toContainEqual({
      from: 'secure.gravatar.com',
      to: '/_custom/proxy/gravatar',
    })
    expect(config?.routes?.['/_custom/proxy/gravatar/**']).toEqual({
      proxy: 'https://secure.gravatar.com/**',
    })
    expect(config?.routes?.['/_custom/proxy/gravatar-avatar/**']).toEqual({
      proxy: 'https://gravatar.com/avatar/**',
    })
  })
})
