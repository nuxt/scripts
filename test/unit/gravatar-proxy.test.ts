import { describe, expect, it } from 'vitest'
import { getProxyConfig } from '../../src/proxy-configs'

describe('gravatar proxy config', () => {
  it('returns proxy config for gravatar', () => {
    const config = getProxyConfig('gravatar', '/_scripts/c')
    expect(config).toBeDefined()
    expect(config?.rewrite).toBeDefined()
    expect(config?.routes).toBeDefined()
  })

  it('rewrites secure.gravatar.com for hovercards JS', () => {
    const config = getProxyConfig('gravatar', '/_scripts/c')
    expect(config?.rewrite).toContainEqual({
      from: 'secure.gravatar.com',
      to: '/_scripts/c/gravatar',
    })
  })

  it('rewrites gravatar.com/avatar for image proxying', () => {
    const config = getProxyConfig('gravatar', '/_scripts/c')
    expect(config?.rewrite).toContainEqual({
      from: 'gravatar.com/avatar',
      to: '/_scripts/c/gravatar-avatar',
    })
  })

  it('routes proxy to correct targets', () => {
    const config = getProxyConfig('gravatar', '/_scripts/c')
    expect(config?.routes?.['/_scripts/c/gravatar/**']).toEqual({
      proxy: 'https://secure.gravatar.com/**',
    })
    expect(config?.routes?.['/_scripts/c/gravatar-avatar/**']).toEqual({
      proxy: 'https://gravatar.com/avatar/**',
    })
  })

  it('uses custom collectPrefix', () => {
    const config = getProxyConfig('gravatar', '/_custom/proxy')
    expect(config?.rewrite).toContainEqual({
      from: 'secure.gravatar.com',
      to: '/_custom/proxy/gravatar',
    })
    expect(config?.routes).toHaveProperty('/_custom/proxy/gravatar/**')
    expect(config?.routes).toHaveProperty('/_custom/proxy/gravatar-avatar/**')
  })
})
