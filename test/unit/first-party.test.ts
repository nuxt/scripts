import type { RegistryScript } from '../../packages/script/src/runtime/types'
import { describe, expect, it } from 'vitest'
import { resolveConfiguredProxyDomains } from '../../packages/script/src/module'
import { buildProxyConfigsFromRegistry, registry } from '../../packages/script/src/registry'
import {
  anonymizeIP,
  FINGERPRINT_HEADERS,
  IP_HEADERS,
  mergePrivacy,
  normalizeLanguage,
  normalizeUserAgent,
  resolvePrivacy,
  SENSITIVE_HEADERS,
  stripPayloadFingerprinting,
} from '../../packages/script/src/runtime/server/utils/privacy'

let _registryScripts: RegistryScript[] | undefined
let _proxyConfigs: ReturnType<typeof buildProxyConfigsFromRegistry> | undefined

async function getRegistryScripts(): Promise<RegistryScript[]> {
  if (!_registryScripts)
    _registryScripts = await registry()
  return _registryScripts
}

async function getProxyConfigs() {
  if (!_proxyConfigs)
    _proxyConfigs = buildProxyConfigsFromRegistry(await getRegistryScripts())
  return _proxyConfigs
}

describe('first-party mode', () => {
  describe('registry key integrity', () => {
    it('every registry script has a registryKey', async () => {
      const scripts = await getRegistryScripts()
      for (const script of scripts) {
        expect(script.registryKey, `Script "${script.label}" is missing registryKey`).toBeDefined()
        expect(script.registryKey, `Script "${script.label}" has empty registryKey`).not.toBe('')
      }
    })

    it('no duplicate registryKeys', async () => {
      const scripts = await getRegistryScripts()
      const keys = scripts.map(s => s.registryKey).filter(Boolean)
      const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i)
      expect(duplicates, `Duplicate registryKeys found: ${duplicates.join(', ')}`).toEqual([])
    })

    it('registryKey matches import name convention for all scripts with imports', async () => {
      const scripts = await getRegistryScripts()
      for (const script of scripts) {
        if (!script.import?.name || !script.registryKey)
          continue
        const expected = `usescript${script.registryKey.toLowerCase()}`
        expect(
          script.import.name.toLowerCase(),
          `Script "${script.registryKey}": import name "${script.import.name}" doesn't match convention`,
        ).toBe(expected)
      }
    })
  })

  describe('proxy config ↔ registry consistency', () => {
    it('every script with proxy alias has a valid proxy config', async () => {
      const scripts = await getRegistryScripts()
      const configs = await getProxyConfigs()
      const proxyConfigKeys = Object.keys(configs)

      for (const script of scripts) {
        if (typeof script.proxy === 'string') {
          expect(
            proxyConfigKeys,
            `Script "${script.registryKey}" references proxy alias "${script.proxy}" but no config exists`,
          ).toContain(script.proxy)
        }
      }
    })

    it('every proxy config is referenced by at least one registry script with proxy', async () => {
      const scripts = await getRegistryScripts()
      const configs = await getProxyConfigs()
      const usedProxyKeys = new Set<string>()
      for (const s of scripts) {
        if (!s.proxy)
          continue
        if (typeof s.proxy === 'string')
          usedProxyKeys.add(s.proxy)
        if (s.registryKey)
          usedProxyKeys.add(s.registryKey)
      }

      for (const configKey of Object.keys(configs)) {
        expect(
          usedProxyKeys.has(configKey),
          `Proxy config "${configKey}" exists but no registry script references it`,
        ).toBe(true)
      }
    })

    it('every proxy config has domains', async () => {
      const configs = await getProxyConfigs()
      for (const [key, config] of Object.entries(configs)) {
        expect(config.domains, `Proxy config "${key}" is missing domains`).toBeDefined()
        expect(config.domains.length, `Proxy config "${key}" has empty domains`).toBeGreaterThan(0)
      }
    })

    it('every proxy config has valid privacy settings', async () => {
      const configs = await getProxyConfigs()
      const privacyFlags = ['ip', 'userAgent', 'language', 'screen', 'timezone', 'hardware'] as const

      for (const [key, config] of Object.entries(configs)) {
        expect(config.privacy, `Proxy config "${key}" is missing privacy`).toBeDefined()
        for (const flag of privacyFlags) {
          expect(
            typeof config.privacy[flag],
            `Proxy config "${key}" privacy.${flag} should be boolean`,
          ).toBe('boolean')
        }
      }
    })
  })

  describe('auto-inject integrity', () => {
    it('auto-inject configs produce correct endpoint values', async () => {
      const configs = await getProxyConfigs()

      // posthog US
      expect(configs.posthog.autoInject).toBeDefined()
      expect(configs.posthog.autoInject!.configField).toBe('apiHost')
      expect(configs.posthog.autoInject!.computeValue('/_proxy', {})).toBe('/_proxy/us.i.posthog.com')

      // posthog EU
      expect(configs.posthog.autoInject!.computeValue('/_proxy', { region: 'eu' })).toBe('/_proxy/eu.i.posthog.com')

      // plausible
      expect(configs.plausibleAnalytics.autoInject).toBeDefined()
      expect(configs.plausibleAnalytics.autoInject!.configField).toBe('endpoint')
      expect(configs.plausibleAnalytics.autoInject!.computeValue('/_proxy', {})).toBe('/_proxy/plausible.io/api/event')

      // umami
      expect(configs.umamiAnalytics.autoInject).toBeDefined()
      expect(configs.umamiAnalytics.autoInject!.configField).toBe('hostUrl')
      expect(configs.umamiAnalytics.autoInject!.computeValue('/_proxy', {})).toBe('/_proxy/cloud.umami.is')

      // rybbit
      expect(configs.rybbitAnalytics.autoInject).toBeDefined()
      expect(configs.rybbitAnalytics.autoInject!.configField).toBe('analyticsHost')
      expect(configs.rybbitAnalytics.autoInject!.computeValue('/_proxy', {})).toBe('/_proxy/app.rybbit.io/api')

      // databuddy
      expect(configs.databuddyAnalytics.autoInject).toBeDefined()
      expect(configs.databuddyAnalytics.autoInject!.configField).toBe('apiUrl')
      expect(configs.databuddyAnalytics.autoInject!.computeValue('/_proxy', {})).toBe('/_proxy/basket.databuddy.cc')
    })

    it('auto-inject configs use custom proxyPrefix', async () => {
      const configs = await getProxyConfigs()
      expect(configs.posthog.autoInject!.computeValue('/_custom', {})).toBe('/_custom/us.i.posthog.com')
      expect(configs.plausibleAnalytics.autoInject!.computeValue('/_custom', {})).toBe('/_custom/plausible.io/api/event')
    })

    it('scripts without auto-inject do not have the property', async () => {
      const configs = await getProxyConfigs()
      expect(configs.googleAnalytics.autoInject).toBeUndefined()
      expect(configs.metaPixel.autoInject).toBeUndefined()
      expect(configs.clarity.autoInject).toBeUndefined()
    })

    it('derives extra allowlist domains for self-hosted Umami', async () => {
      const configs = await getProxyConfigs()
      expect(resolveConfiguredProxyDomains({
        scriptInput: {
          src: 'https://analytics.example.com/script.js',
        },
      }, configs.umamiAnalytics)).toEqual(['analytics.example.com'])
    })

    it('derives extra allowlist domains for custom Matomo hosts', async () => {
      const configs = await getProxyConfigs()
      expect(resolveConfiguredProxyDomains({
        matomoUrl: 'https://analytics.example.com',
        trackerUrl: 'https://analytics.example.com/matomo.php',
      }, configs.matomoAnalytics)).toEqual(['analytics.example.com'])
    })

    it('derives extra allowlist domains for self-hosted Vercel Analytics', async () => {
      const configs = await getProxyConfigs()
      expect(resolveConfiguredProxyDomains({
        endpoint: 'https://analytics.example.com/v1/vitals',
      }, configs.vercelAnalytics)).toEqual(['analytics.example.com'])
    })

    it('derives extra allowlist domains for custom Databuddy script hosts', async () => {
      const configs = await getProxyConfigs()
      expect(resolveConfiguredProxyDomains({
        scriptUrl: 'https://cdn.analytics.example.com/databuddy.js',
        apiUrl: 'https://events.analytics.example.com',
      }, configs.databuddyAnalytics)).toEqual(['cdn.analytics.example.com', 'events.analytics.example.com'])
    })

    it('derives extra allowlist domains for self-hosted PostHog apiHost', async () => {
      const configs = await getProxyConfigs()
      expect(resolveConfiguredProxyDomains({
        apiHost: 'https://posthog.example.com',
      }, configs.posthog)).toEqual(['posthog.example.com'])
    })
  })

  describe('full chain: capabilities → proxy config → domains', () => {
    it('every script with proxy gets domains via registryKey lookup', async () => {
      const scripts = await getRegistryScripts()
      const configs = await getProxyConfigs()

      for (const script of scripts) {
        if (!script.proxy || !script.registryKey)
          continue

        const configKey = typeof script.proxy === 'string' ? script.proxy : script.registryKey
        const proxyConfig = configs[configKey]
        if (!proxyConfig)
          continue

        expect(
          proxyConfig.domains.length,
          `Script "${script.registryKey}" (config "${configKey}") has no domains`,
        ).toBeGreaterThan(0)
      }
    })

    it('collects a significant number of domains across all proxy configs', async () => {
      const scripts = await getRegistryScripts()
      const configs = await getProxyConfigs()

      const allDomains = new Set<string>()
      for (const script of scripts) {
        if (!script.proxy || !script.registryKey)
          continue
        const configKey = typeof script.proxy === 'string' ? script.proxy : script.registryKey
        const proxyConfig = configs[configKey]
        if (proxyConfig) {
          for (const domain of proxyConfig.domains)
            allDomains.add(domain)
        }
      }

      expect(allDomains.size).toBeGreaterThan(20)
    })
  })

  describe('default configuration', () => {
    it('proxy configs are available for all supported scripts', async () => {
      const configs = await getProxyConfigs()
      expect(Object.keys(configs).length).toBeGreaterThan(0)
    })

    it('all supported scripts have domains and privacy', async () => {
      const configs = await getProxyConfigs()
      const supportedScripts = [
        'googleAnalytics',
        'metaPixel',
        'tiktokPixel',
        'xPixel',
        'snapchatPixel',
        'redditPixel',
        'clarity',
        'hotjar',
      ]

      for (const script of supportedScripts) {
        const config = configs[script]
        expect(config, `${script} should have config`).toBeDefined()
        expect(config.domains, `${script} should have domains`).toBeDefined()
        expect(config.domains.length, `${script} should have at least one domain`).toBeGreaterThan(0)
        expect(config.privacy, `${script} should have privacy config`).toBeDefined()
      }
    })
  })

  describe('scripts that need fingerprinting have no proxy', () => {
    it('stripe, paypal, googleRecaptcha, googleSignIn have no proxy capability', async () => {
      const scripts = await getRegistryScripts()
      const fingerprintScripts = ['stripe', 'paypal', 'googleRecaptcha', 'googleSignIn']

      for (const key of fingerprintScripts) {
        const script = scripts.find(s => s.registryKey === key)
        expect(script, `${key} should exist in registry`).toBeDefined()
        expect(script!.proxy, `${key} should not have proxy`).toBeFalsy()
      }
    })

    it('fingerprinting scripts have no proxy configs', async () => {
      const configs = await getProxyConfigs()
      expect(configs.stripe).toBeUndefined()
      expect(configs.paypal).toBeUndefined()
      expect(configs.googleRecaptcha).toBeUndefined()
      expect(configs.googleSignIn).toBeUndefined()
    })
  })
})

describe('proxy handler', () => {
  describe('binary detection heuristics', () => {
    const COMPRESSION_RE = /gzip|deflate|br|compress|base64/i

    it('detects gzip content-encoding as binary', () => {
      expect(COMPRESSION_RE.test('gzip')).toBe(true)
    })

    it('detects br content-encoding as binary', () => {
      expect(COMPRESSION_RE.test('br')).toBe(true)
    })

    it('detects deflate content-encoding as binary', () => {
      expect(COMPRESSION_RE.test('deflate')).toBe(true)
    })

    it('detects gzip-js compression query param', () => {
      expect(COMPRESSION_RE.test('gzip-js')).toBe(true)
    })

    it('detects base64 compression query param', () => {
      expect(COMPRESSION_RE.test('base64')).toBe(true)
    })

    it('does not match plain text', () => {
      expect(COMPRESSION_RE.test('none')).toBe(false)
      expect(COMPRESSION_RE.test('identity')).toBe(false)
      expect(COMPRESSION_RE.test('')).toBe(false)
    })

    it('octet-stream content type triggers binary path', () => {
      expect('application/octet-stream'.includes('octet-stream')).toBe(true)
      expect('text/plain'.includes('octet-stream')).toBe(false)
    })
  })

  describe('privacy stripping logic', () => {
    it('resolvePrivacy(true) enables all flags', () => {
      const p = resolvePrivacy(true)
      expect(p.ip).toBe(true)
      expect(p.userAgent).toBe(true)
      expect(p.language).toBe(true)
      expect(p.screen).toBe(true)
      expect(p.timezone).toBe(true)
      expect(p.hardware).toBe(true)
    })

    it('resolvePrivacy(false) disables all flags', () => {
      const p = resolvePrivacy(false)
      expect(p.ip).toBe(false)
      expect(p.userAgent).toBe(false)
      expect(p.language).toBe(false)
    })

    it('resolvePrivacy with partial object defaults unset flags to false', () => {
      const p = resolvePrivacy({ ip: true })
      expect(p.ip).toBe(true)
      expect(p.userAgent).toBe(false)
      expect(p.screen).toBe(false)
    })

    it('mergePrivacy overrides specific fields', () => {
      const base = resolvePrivacy(true)
      const merged = mergePrivacy(base, { ip: false })
      expect(merged.ip).toBe(false)
      expect(merged.userAgent).toBe(true)
    })

    it('mergePrivacy with boolean override replaces entirely', () => {
      const base = resolvePrivacy(true)
      const merged = mergePrivacy(base, false)
      expect(merged.ip).toBe(false)
      expect(merged.userAgent).toBe(false)
    })

    it('iP headers list contains expected headers', () => {
      expect(IP_HEADERS).toContain('x-forwarded-for')
      expect(IP_HEADERS).toContain('x-real-ip')
      expect(IP_HEADERS).toContain('cf-connecting-ip')
    })

    it('sensitive headers are always stripped', () => {
      expect(SENSITIVE_HEADERS).toContain('cookie')
      expect(SENSITIVE_HEADERS).toContain('authorization')
    })

    it('fingerprint headers include UA and language', () => {
      expect(FINGERPRINT_HEADERS).toContain('user-agent')
      expect(FINGERPRINT_HEADERS).toContain('accept-language')
    })

    it('anonymizeIP masks last octet for IPv4', () => {
      expect(anonymizeIP('192.168.1.42')).toBe('192.168.1.0')
    })

    it('anonymizeIP keeps first 3 segments for IPv6', () => {
      expect(anonymizeIP('2001:db8:85a3:7334::')).toBe('2001:db8:85a3::')
    })

    it('normalizeUserAgent reduces to family + major version', () => {
      const ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0.6422.60 Safari/537.36'
      expect(normalizeUserAgent(ua)).toBe('Mozilla/5.0 (compatible; Chrome/125.0)')
    })

    it('normalizeLanguage extracts primary tag', () => {
      expect(normalizeLanguage('en-US,en;q=0.9,fr;q=0.8')).toBe('en-US')
    })

    it('stripPayloadFingerprinting strips IP params when ip=true', () => {
      const result = stripPayloadFingerprinting(
        { uip: '192.168.1.1', other: 'keep' },
        resolvePrivacy({ ip: true }),
      )
      expect(result.uip).not.toBe('192.168.1.1')
      expect(result.other).toBe('keep')
    })

    it('stripPayloadFingerprinting preserves userId params', () => {
      const result = stripPayloadFingerprinting(
        { uid: 'user123', cid: 'client456' },
        resolvePrivacy(true),
      )
      expect(result.uid).toBe('user123')
      expect(result.cid).toBe('client456')
    })

    it('stripPayloadFingerprinting generalizes screen params when screen=true', () => {
      const result = stripPayloadFingerprinting(
        { sr: '2560x1440', vp: '1280x720' },
        resolvePrivacy({ screen: true }),
      )
      expect(result.sr).toBe('1920x1080')
      expect(result.vp).toBe('1920x1080')
    })
  })

  describe('domain-based matching', () => {
    it('getProxyConfigs returns domains for known providers', async () => {
      const configs = await getProxyConfigs()
      const gaConfig = configs.googleAnalytics
      expect(gaConfig).toBeDefined()
      expect(gaConfig.domains).toBeDefined()
      expect(gaConfig.domains.length).toBeGreaterThan(0)
    })

    it('plausibleAnalytics has domains', async () => {
      const configs = await getProxyConfigs()
      expect(configs.plausibleAnalytics).toBeDefined()
      expect(configs.plausibleAnalytics.domains.length).toBeGreaterThan(0)
    })

    it('hotjar has domains', async () => {
      const configs = await getProxyConfigs()
      expect(configs.hotjar).toBeDefined()
      expect(configs.hotjar.domains.length).toBeGreaterThan(0)
    })
  })
})
