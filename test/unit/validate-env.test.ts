import type { ConsolaInstance } from 'consola'
import type { RegistryScript } from '../../packages/script/src/runtime/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateScriptsEnvVars } from '../../packages/script/src/validate-env'

const scripts = [
  { registryKey: 'clarity', envDefaults: { id: '' } },
  { registryKey: 'facebookPixel', envDefaults: { id: '' } },
  { registryKey: 'matomoAnalytics', envDefaults: { matomoUrl: '', siteId: '' } },
] as unknown as RegistryScript[]

function makeLogger() {
  return { warn: vi.fn() } as unknown as ConsolaInstance
}

describe('validateScriptsEnvVars', () => {
  const removeKeys: string[] = []

  beforeEach(() => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('NUXT_PUBLIC_SCRIPTS_'))
        delete process.env[k]
    }
  })

  afterEach(() => {
    for (const k of removeKeys.splice(0))
      delete process.env[k]
  })

  it('does not warn for valid env var on enabled script', () => {
    process.env.NUXT_PUBLIC_SCRIPTS_CLARITY_ID = 'abc'
    removeKeys.push('NUXT_PUBLIC_SCRIPTS_CLARITY_ID')
    const logger = makeLogger()
    validateScriptsEnvVars(scripts, new Set(['clarity']), logger)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('warns when env var uses marketing name instead of registry key', () => {
    process.env.NUXT_PUBLIC_SCRIPTS_MICROSOFT_CLARITY_ID = 'abc'
    removeKeys.push('NUXT_PUBLIC_SCRIPTS_MICROSOFT_CLARITY_ID')
    const logger = makeLogger()
    validateScriptsEnvVars(scripts, new Set(['clarity']), logger)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    const msg = (logger.warn as any).mock.calls[0][0] as string
    expect(msg).toContain('NUXT_PUBLIC_SCRIPTS_MICROSOFT_CLARITY_ID')
    expect(msg).toContain('clarity')
  })

  it('warns when field is unknown on a valid key', () => {
    process.env.NUXT_PUBLIC_SCRIPTS_CLARITY_FOO = 'x'
    removeKeys.push('NUXT_PUBLIC_SCRIPTS_CLARITY_FOO')
    const logger = makeLogger()
    validateScriptsEnvVars(scripts, new Set(['clarity']), logger)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    const msg = (logger.warn as any).mock.calls[0][0] as string
    expect(msg).toContain('does not match any option on `clarity`')
    expect(msg).toContain('NUXT_PUBLIC_SCRIPTS_CLARITY_ID')
  })

  it('warns when env var is set but script not registered', () => {
    process.env.NUXT_PUBLIC_SCRIPTS_CLARITY_ID = 'abc'
    removeKeys.push('NUXT_PUBLIC_SCRIPTS_CLARITY_ID')
    const logger = makeLogger()
    validateScriptsEnvVars(scripts, new Set(), logger)
    expect(logger.warn).toHaveBeenCalledTimes(1)
    const msg = (logger.warn as any).mock.calls[0][0] as string
    expect(msg).toContain('is not registered')
    expect(msg).toContain('clarity')
  })

  it('handles camelCase registry keys', () => {
    process.env.NUXT_PUBLIC_SCRIPTS_FACEBOOK_PIXEL_ID = 'abc'
    removeKeys.push('NUXT_PUBLIC_SCRIPTS_FACEBOOK_PIXEL_ID')
    const logger = makeLogger()
    validateScriptsEnvVars(scripts, new Set(['facebookPixel']), logger)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('handles multi-field scripts', () => {
    process.env.NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_SITE_ID = '1'
    process.env.NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_MATOMO_URL = 'https://x'
    removeKeys.push('NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_SITE_ID', 'NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_MATOMO_URL')
    const logger = makeLogger()
    validateScriptsEnvVars(scripts, new Set(['matomoAnalytics']), logger)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  describe('globals env vars', () => {
    it('does not warn for valid globals env var on configured key', () => {
      process.env.NUXT_PUBLIC_SCRIPTS_GLOBALS_TRUSTED_SHOPS_SRC = 'https://x'
      removeKeys.push('NUXT_PUBLIC_SCRIPTS_GLOBALS_TRUSTED_SHOPS_SRC')
      const logger = makeLogger()
      validateScriptsEnvVars(scripts, new Set(), logger, ['trustedShops'])
      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('warns and suggests when globals key is typoed', () => {
      process.env.NUXT_PUBLIC_SCRIPTS_GLOBALS_TRUSTED_SHOP_SRC = 'https://x'
      removeKeys.push('NUXT_PUBLIC_SCRIPTS_GLOBALS_TRUSTED_SHOP_SRC')
      const logger = makeLogger()
      validateScriptsEnvVars(scripts, new Set(), logger, ['trustedShops'])
      expect(logger.warn).toHaveBeenCalledTimes(1)
      const msg = (logger.warn as any).mock.calls[0][0] as string
      expect(msg).toContain('NUXT_PUBLIC_SCRIPTS_GLOBALS_TRUSTED_SHOP_SRC')
      expect(msg).toContain('trustedShops')
    })

    it('lists configured globals when env var is unrecognisable', () => {
      process.env.NUXT_PUBLIC_SCRIPTS_GLOBALS_TOTALLY_UNRELATED_SRC = 'https://x'
      removeKeys.push('NUXT_PUBLIC_SCRIPTS_GLOBALS_TOTALLY_UNRELATED_SRC')
      const logger = makeLogger()
      validateScriptsEnvVars(scripts, new Set(), logger, ['awin'])
      expect(logger.warn).toHaveBeenCalledTimes(1)
      const msg = (logger.warn as any).mock.calls[0][0] as string
      expect(msg).toContain('Configured globals')
      expect(msg).toContain('awin')
    })

    it('does nothing when no globals are configured', () => {
      process.env.NUXT_PUBLIC_SCRIPTS_GLOBALS_ANYTHING_SRC = 'x'
      removeKeys.push('NUXT_PUBLIC_SCRIPTS_GLOBALS_ANYTHING_SRC')
      const logger = makeLogger()
      validateScriptsEnvVars(scripts, new Set(), logger, [])
      expect(logger.warn).not.toHaveBeenCalled()
    })
  })
})
