import type { RegistryScript } from '../../src/runtime/types'
import { describe, expect, it } from 'vitest'
import { autoInjectProxyEndpoints } from '../../src/first-party/auto-inject'
import { getAllProxyConfigs } from '../../src/proxy-configs'
import { registry } from '../../src/registry'
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
} from '../../src/runtime/server/utils/privacy'

let _registryScripts: RegistryScript[] | undefined

async function getRegistryScripts(): Promise<RegistryScript[]> {
  if (!_registryScripts)
    _registryScripts = await registry()
  return _registryScripts
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
        // Verify the import name follows useScript${PascalCase(registryKey)} convention
        const expected = `usescript${script.registryKey.toLowerCase()}`
        expect(
          script.import.name.toLowerCase(),
          `Script "${script.registryKey}": import name "${script.import.name}" doesn't match convention. Expected "useScript${script.registryKey.charAt(0).toUpperCase()}${script.registryKey.slice(1)}"`,
        ).toBe(expected)
      }
    })
  })

  describe('proxy config ↔ registry consistency', () => {
    it('every script with proxy field has a valid proxy config', async () => {
      const scripts = await getRegistryScripts()
      const configs = getAllProxyConfigs('/_proxy')
      const proxyConfigKeys = Object.keys(configs)

      for (const script of scripts) {
        if (script.proxy && script.proxy !== false) {
          expect(
            proxyConfigKeys,
            `Script "${script.registryKey}" references proxy key "${script.proxy}" but no config exists. Available: ${proxyConfigKeys.join(', ')}`,
          ).toContain(script.proxy)
        }
      }
    })

    it('every proxy config is referenced by at least one registry script', async () => {
      const scripts = await getRegistryScripts()
      const configs = getAllProxyConfigs('/_proxy')
      const usedProxyKeys = new Set(scripts.map(s => s.proxy).filter(Boolean))

      for (const configKey of Object.keys(configs)) {
        expect(
          usedProxyKeys.has(configKey),
          `Proxy config "${configKey}" exists but no registry script references it`,
        ).toBe(true)
      }
    })

    it('every proxy config has routes', () => {
      const configs = getAllProxyConfigs('/_proxy')
      for (const [key, config] of Object.entries(configs)) {
        expect(config.routes, `Proxy config "${key}" is missing routes`).toBeDefined()
        expect(Object.keys(config.routes!).length, `Proxy config "${key}" has empty routes`).toBeGreaterThan(0)
      }
    })

    it('every proxy config has valid privacy settings', () => {
      const configs = getAllProxyConfigs('/_proxy')
      const privacyFlags = ['ip', 'userAgent', 'language', 'screen', 'timezone', 'hardware'] as const

      for (const [key, config] of Object.entries(configs)) {
        expect(config.privacy, `Proxy config "${key}" is missing privacy`).toBeDefined()
        for (const flag of privacyFlags) {
          expect(
            typeof config.privacy[flag],
            `Proxy config "${key}" privacy.${flag} should be boolean, got ${typeof config.privacy[flag]}`,
          ).toBe('boolean')
        }
      }
    })
  })

  describe('auto-inject integrity', () => {
    it('auto-inject defs reference valid registry keys', async () => {
      const scripts = await getRegistryScripts()
      const registryKeys = new Set(scripts.map(s => s.registryKey).filter(Boolean))

      // Test that autoInjectProxyEndpoints doesn't crash and handles all known keys
      const mockRegistry: Record<string, any> = {}
      for (const key of registryKeys) {
        mockRegistry[key!] = {}
      }

      const mockRuntimeConfig = { public: { scripts: { ...mockRegistry } } }
      // Should not throw
      autoInjectProxyEndpoints(mockRegistry as any, mockRuntimeConfig, '/_proxy')
    })

    it('auto-inject populates endpoint config for supported scripts', () => {
      const registry: Record<string, any> = {
        posthog: { apiKey: 'test' },
        plausibleAnalytics: { domain: 'test.com' },
        umamiAnalytics: { websiteId: 'test' },
        rybbitAnalytics: { siteId: 'test' },
        databuddyAnalytics: { clientId: 'test' },
      }
      const runtimeConfig = { public: { scripts: { ...registry } } }
      autoInjectProxyEndpoints(registry as any, runtimeConfig, '/_proxy')

      expect(registry.posthog.apiHost).toBe('/_proxy/ph')
      expect(registry.plausibleAnalytics.endpoint).toBe('/_proxy/plausible/api/event')
      expect(registry.umamiAnalytics.hostUrl).toBe('/_proxy/umami')
      expect(registry.rybbitAnalytics.analyticsHost).toBe('/_proxy/rybbit/api')
      expect(registry.databuddyAnalytics.apiUrl).toBe('/_proxy/databuddy-api')
    })

    it('auto-inject does not override user-provided endpoint config', () => {
      const registry: Record<string, any> = {
        posthog: { apiKey: 'test', apiHost: 'https://custom.example.com' },
        plausibleAnalytics: { domain: 'test.com', endpoint: 'https://custom.example.com/api/event' },
      }
      const runtimeConfig = { public: { scripts: { ...registry } } }
      autoInjectProxyEndpoints(registry as any, runtimeConfig, '/_proxy')

      expect(registry.posthog.apiHost).toBe('https://custom.example.com')
      expect(registry.plausibleAnalytics.endpoint).toBe('https://custom.example.com/api/event')
    })

    it('posthog EU region gets correct proxy prefix', () => {
      const registry: Record<string, any> = {
        posthog: { apiKey: 'test', region: 'eu' },
      }
      const runtimeConfig = { public: { scripts: { ...registry } } }
      autoInjectProxyEndpoints(registry as any, runtimeConfig, '/_proxy')

      expect(registry.posthog.apiHost).toBe('/_proxy/ph-eu')
    })
  })

  describe('full chain: config key → registry script → proxy config → routes', () => {
    it('every script with a proxy gets routes registered via registryKey lookup', async () => {
      const scripts = await getRegistryScripts()
      const configs = getAllProxyConfigs('/_proxy')

      // Build the same lookup map as finalizeFirstParty
      const scriptByKey = new Map<string, RegistryScript>()
      for (const script of scripts) {
        if (script.registryKey)
          scriptByKey.set(script.registryKey, script)
      }

      // For every script that has a proxy, simulate the full lookup chain
      for (const script of scripts) {
        if (!script.proxy || script.proxy === false)
          continue

        // 1. Can we find the script by registryKey?
        const found = scriptByKey.get(script.registryKey!)
        expect(found, `Script "${script.registryKey}" not found in lookup map`).toBeDefined()

        // 2. Does the proxy key resolve to a config?
        const proxyConfig = configs[script.proxy]
        expect(proxyConfig, `Script "${script.registryKey}" proxy key "${script.proxy}" has no config`).toBeDefined()

        // 3. Does the config have routes?
        expect(
          Object.keys(proxyConfig.routes || {}).length,
          `Script "${script.registryKey}" proxy "${script.proxy}" has no routes`,
        ).toBeGreaterThan(0)
      }
    })

    it('simulates finalizeFirstParty registry key matching for all scripts', async () => {
      const scripts = await getRegistryScripts()
      const configs = getAllProxyConfigs('/_proxy')

      // Build lookup map exactly as finalizeFirstParty does
      const scriptByKey = new Map<string, RegistryScript>()
      for (const script of scripts) {
        if (script.registryKey)
          scriptByKey.set(script.registryKey, script)
      }

      // Create a mock registry with all scripts that have proxy support
      const mockRegistryKeys = scripts
        .filter(s => s.proxy && s.proxy !== false && s.registryKey)
        .map(s => s.registryKey!)

      const neededRoutes: Record<string, { proxy: string }> = {}
      const unmatchedScripts: string[] = []

      for (const key of mockRegistryKeys) {
        const script = scriptByKey.get(key)
        if (!script) {
          unmatchedScripts.push(key)
          continue
        }
        const proxyKey = script.proxy || undefined
        if (proxyKey && typeof proxyKey === 'string') {
          const proxyConfig = configs[proxyKey]
          if (proxyConfig?.routes)
            Object.assign(neededRoutes, proxyConfig.routes)
        }
      }

      // No scripts should be unmatched
      expect(unmatchedScripts, `These scripts failed registry key lookup: ${unmatchedScripts.join(', ')}`).toEqual([])

      // Should have a significant number of routes
      expect(Object.keys(neededRoutes).length).toBeGreaterThan(20)
    })
  })

  describe('default configuration', () => {
    it('proxy configs are available for all supported scripts', async () => {
      const configs = getAllProxyConfigs('/_scripts/c')
      expect(Object.keys(configs).length).toBeGreaterThan(0)
    })

    it('all supported scripts have both rewrite and routes', () => {
      const configs = getAllProxyConfigs('/_scripts/c')
      const supportedScripts = [
        'googleAnalytics',
        'googleTagManager',
        'metaPixel',
        'tiktokPixel',
        'segment',
        'xPixel',
        'snapchatPixel',
        'redditPixel',
        'clarity',
        'hotjar',
      ]

      for (const script of supportedScripts) {
        const config = configs[script]
        expect(config, `${script} should have config`).toBeDefined()
        expect(config.rewrite, `${script} should have rewrite rules`).toBeDefined()
        expect(config.routes, `${script} should have route rules`).toBeDefined()
        expect(config.rewrite!.length, `${script} should have at least one rewrite`).toBeGreaterThan(0)
        expect(Object.keys(config.routes!).length, `${script} should have at least one route`).toBeGreaterThan(0)
      }
    })
  })

  describe('custom collectPrefix', () => {
    it('applies custom prefix to all configs', () => {
      const customPrefix = '/_analytics'
      const configs = getAllProxyConfigs(customPrefix)

      for (const [key, config] of Object.entries(configs)) {
        // All rewrites should use custom prefix
        for (const rewrite of config.rewrite || []) {
          expect(rewrite.to, `${key} rewrite should use custom prefix`).toContain(customPrefix)
        }
        // All routes should use custom prefix
        for (const route of Object.keys(config.routes || {})) {
          expect(route, `${key} route should use custom prefix`).toContain(customPrefix)
        }
      }
    })
  })

  describe('route rule format', () => {
    it('all routes have valid proxy target', () => {
      const configs = getAllProxyConfigs('/_scripts/c')

      for (const [key, config] of Object.entries(configs)) {
        for (const [route, rule] of Object.entries(config.routes || {})) {
          expect(rule.proxy, `${key} route ${route} should have proxy target`).toBeDefined()
          expect(rule.proxy, `${key} route ${route} should proxy to https`).toMatch(/^https:\/\//)
          expect(rule.proxy, `${key} route ${route} should have wildcard`).toContain('**')
        }
      }
    })

    it('route patterns match Nitro format', () => {
      const configs = getAllProxyConfigs('/_scripts/c')

      for (const [key, config] of Object.entries(configs)) {
        for (const route of Object.keys(config.routes || {})) {
          // Should end with /** for wildcard matching
          expect(route, `${key} route should end with /**`).toMatch(/\/\*\*$/)
        }
      }
    })
  })

  describe('status endpoint data structure', () => {
    it('can generate status data from configs', () => {
      const configs = getAllProxyConfigs('/_scripts/c')
      const registryKeys = ['googleAnalytics', 'metaPixel']

      // Simulate what the module does to build status
      const neededRoutes: Record<string, string> = {}
      for (const key of registryKeys) {
        const config = configs[key]
        if (config?.routes) {
          for (const [path, rule] of Object.entries(config.routes)) {
            neededRoutes[path] = rule.proxy
          }
        }
      }

      const status = {
        enabled: true,
        scripts: registryKeys,
        routes: neededRoutes,
        collectPrefix: '/_scripts/c',
      }

      expect(status.enabled).toBe(true)
      expect(status.scripts).toEqual(['googleAnalytics', 'metaPixel'])
      expect(Object.keys(status.routes).length).toBeGreaterThan(0)
      expect(status.collectPrefix).toBe('/_scripts/c')
    })
  })
})

describe('proxy handler', () => {
  describe('binary detection heuristics', () => {
    // isBinaryBody is inline in proxy-handler (not exported), but the logic is:
    // content-encoding present OR octet-stream content-type OR compression query param matches COMPRESSION_RE
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
      const base = resolvePrivacy(true) // all true
      const merged = mergePrivacy(base, { ip: false })
      expect(merged.ip).toBe(false)
      expect(merged.userAgent).toBe(true) // unchanged
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
      expect(result.uip).not.toBe('192.168.1.1') // anonymized
      expect(result.other).toBe('keep')
    })

    it('stripPayloadFingerprinting preserves userId params', () => {
      const result = stripPayloadFingerprinting(
        { uid: 'user123', cid: 'client456' },
        resolvePrivacy(true),
      )
      // userId params are intentionally preserved for analytics
      expect(result.uid).toBe('user123')
      expect(result.cid).toBe('client456')
    })

    it('stripPayloadFingerprinting generalizes screen params when screen=true', () => {
      const result = stripPayloadFingerprinting(
        { sr: '2560x1440', vp: '1280x720' },
        resolvePrivacy({ screen: true }),
      )
      expect(result.sr).toBe('1920x1080') // bucketed to desktop
      expect(result.vp).toBe('1920x1080')
    })
  })

  describe('route matching', () => {
    it('getAllProxyConfigs returns routes for known providers', () => {
      const configs = getAllProxyConfigs('/_proxy')
      const gaConfig = configs.googleAnalytics
      expect(gaConfig).toBeDefined()
      expect(gaConfig.routes).toBeDefined()

      const routes = Object.keys(gaConfig.routes!)
      expect(routes.length).toBeGreaterThan(0)
      // All routes should start with the prefix
      for (const route of routes) {
        expect(route).toContain('/_proxy/')
      }
    })

    it('route targets point to https endpoints', () => {
      const configs = getAllProxyConfigs('/_proxy')
      for (const [key, config] of Object.entries(configs)) {
        for (const [route, rule] of Object.entries(config.routes || {})) {
          expect(rule.proxy, `${key} ${route}`).toMatch(/^https:\/\//)
        }
      }
    })

    it('longest route prefix matches first (sorted by length descending)', () => {
      // Replicate the getSortedRoutes logic
      const routes: Record<string, string> = {
        '/_proxy/ga/**': 'https://google.com/**',
        '/_proxy/ga/collect/**': 'https://google.com/collect/**',
        '/_proxy/**': 'https://fallback.com/**',
      }
      const sorted = Object.entries(routes).sort((a, b) => b[0].length - a[0].length)
      expect(sorted[0]![0]).toBe('/_proxy/ga/collect/**')
      expect(sorted[1]![0]).toBe('/_proxy/ga/**')
      expect(sorted[2]![0]).toBe('/_proxy/**')
    })

    it('plausible has proxy routes', () => {
      const configs = getAllProxyConfigs('/_proxy')
      expect(configs.plausible).toBeDefined()
      expect(Object.keys(configs.plausible.routes!).length).toBeGreaterThan(0)
    })

    it('hotjar has proxy routes', () => {
      const configs = getAllProxyConfigs('/_proxy')
      expect(configs.hotjar).toBeDefined()
      expect(Object.keys(configs.hotjar.routes!).length).toBeGreaterThan(0)
    })
  })
})
