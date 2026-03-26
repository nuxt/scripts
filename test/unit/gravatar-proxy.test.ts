import { describe, expect, it } from 'vitest'
import { buildProxyConfigsFromRegistry, registry } from '../../packages/script/src/registry'

let _proxyConfigs: ReturnType<typeof buildProxyConfigsFromRegistry> | undefined
async function getProxyConfigs() {
  if (!_proxyConfigs)
    _proxyConfigs = buildProxyConfigsFromRegistry(await registry())
  return _proxyConfigs
}

describe('gravatar proxy config', () => {
  it('returns proxy config for gravatar', async () => {
    const config = (await getProxyConfigs()).gravatar
    expect(config).toBeDefined()
    expect(config?.domains).toBeDefined()
    expect(config?.privacy).toBeDefined()
  })

  it('has correct domains', async () => {
    const config = (await getProxyConfigs()).gravatar
    expect(config?.domains).toContain('secure.gravatar.com')
    expect(config?.domains).toContain('gravatar.com')
  })

  it('uses IP_ONLY privacy', async () => {
    const config = (await getProxyConfigs()).gravatar
    expect(config?.privacy.ip).toBe(true)
    expect(config?.privacy.userAgent).toBe(false)
    expect(config?.privacy.language).toBe(false)
  })

  it('works with custom proxyPrefix', async () => {
    const config = (await getProxyConfigs()).gravatar
    expect(config).toBeDefined()
    expect(config?.domains).toContain('secure.gravatar.com')
    expect(config?.domains).toContain('gravatar.com')
  })
})
