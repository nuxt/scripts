import { describe, expect, it } from 'vitest'
import { $fetch } from 'ofetch'
import { getAllProxyConfigs, rewriteScriptUrls } from '../../src/proxy-configs'
import { stripFingerprintingFromPayload } from '../utils/proxy-privacy'

const COLLECT_PREFIX = '/_scripts/c'

interface ScriptTestCase {
  name: string
  url: string
  registryKey: string
  expectedPatterns: string[] // patterns that should exist BEFORE rewrite
  forbiddenAfterRewrite: string[] // domains that should NOT exist after rewrite
}

const testCases: ScriptTestCase[] = [
  {
    name: 'Google Analytics (gtag.js)',
    url: 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX',
    registryKey: 'googleAnalytics',
    // Modern gtag.js uses www.google.com/g/collect for analytics
    expectedPatterns: ['www.google.com/g/collect', 'googletagmanager.com'],
    forbiddenAfterRewrite: ['www.google.com/g/collect'],
  },
  {
    name: 'Google Tag Manager',
    url: 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXXX',
    registryKey: 'googleTagManager',
    expectedPatterns: ['googletagmanager.com'],
    forbiddenAfterRewrite: ['www.googletagmanager.com'],
  },
  {
    name: 'Meta Pixel (fbevents.js)',
    url: 'https://connect.facebook.net/en_US/fbevents.js',
    registryKey: 'metaPixel',
    expectedPatterns: ['facebook'],
    forbiddenAfterRewrite: ['connect.facebook.net'],
  },
  {
    name: 'TikTok Pixel',
    url: 'https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=XXXXXXX',
    registryKey: 'tiktokPixel',
    expectedPatterns: ['tiktok'],
    forbiddenAfterRewrite: ['analytics.tiktok.com'],
  },
  {
    name: 'Microsoft Clarity',
    url: 'https://www.clarity.ms/tag/XXXXXXX',
    registryKey: 'clarity',
    expectedPatterns: ['clarity'],
    forbiddenAfterRewrite: ['www.clarity.ms'],
  },
  {
    name: 'Hotjar',
    url: 'https://static.hotjar.com/c/hotjar-XXXXXXX.js?sv=7',
    registryKey: 'hotjar',
    expectedPatterns: ['hotjar'],
    forbiddenAfterRewrite: ['static.hotjar.com', 'vars.hotjar.com'],
  },
  {
    name: 'Segment Analytics.js',
    url: 'https://cdn.segment.com/analytics.js/v1/XXXXXXX/analytics.min.js',
    registryKey: 'segment',
    expectedPatterns: ['segment'],
    forbiddenAfterRewrite: ['api.segment.io', 'cdn.segment.com'],
  },
]

describe('third-party script proxy replacements', () => {
  const proxyConfigs = getAllProxyConfigs(COLLECT_PREFIX)

  describe.each(testCases)('$name', ({ name, url, registryKey, expectedPatterns, forbiddenAfterRewrite }) => {
    const proxyConfig = proxyConfigs[registryKey]

    it('has proxy config defined', () => {
      expect(proxyConfig, `Missing proxy config for ${registryKey}`).toBeDefined()
      expect(proxyConfig.rewrite, `Missing rewrite rules for ${registryKey}`).toBeDefined()
      expect(proxyConfig.rewrite!.length, `Empty rewrite rules for ${registryKey}`).toBeGreaterThan(0)
    })

    it('downloads and rewrites script correctly', async () => {
      let content: string
      try {
        content = await $fetch(url, {
          responseType: 'text',
          timeout: 10000,
        })
      }
      catch (e: any) {
        // Some scripts may require valid IDs or have rate limiting
        // Skip if we can't download
        console.warn(`Could not download ${name}: ${e.message}`)
        return
      }

      expect(content.length, `Downloaded content for ${name} is empty`).toBeGreaterThan(0)

      // Check that at least some expected patterns exist before rewrite
      const hasExpectedPatterns = expectedPatterns.some(pattern =>
        content.toLowerCase().includes(pattern.toLowerCase()),
      )

      if (!hasExpectedPatterns) {
        console.warn(`Warning: ${name} script doesn't contain expected patterns. Script may have changed.`)
      }

      // Apply rewrites
      const rewritten = rewriteScriptUrls(content, proxyConfig.rewrite!)

      // Check that forbidden domains are replaced
      for (const forbidden of forbiddenAfterRewrite) {
        // Check for various URL formats
        const patterns = [
          `"https://${forbidden}`,
          `'https://${forbidden}`,
          `\`https://${forbidden}`,
          `"http://${forbidden}`,
          `'http://${forbidden}`,
          `"//${forbidden}`,
          `'//${forbidden}`,
        ]

        for (const pattern of patterns) {
          expect(
            rewritten.includes(pattern),
            `Found unrewritten URL pattern "${pattern}" in ${name}`,
          ).toBe(false)
        }
      }

      // Check that proxy paths were inserted
      const hasProxyPaths = rewritten.includes(COLLECT_PREFIX)
      if (hasExpectedPatterns) {
        expect(hasProxyPaths, `No proxy paths found in rewritten ${name}`).toBe(true)
      }
    }, 15000)
  })

  describe('rewrite completeness', () => {
    it('all proxy configs have matching route rules', () => {
      for (const [key, config] of Object.entries(proxyConfigs)) {
        expect(config.routes, `${key} missing routes`).toBeDefined()
        expect(Object.keys(config.routes!).length, `${key} has empty routes`).toBeGreaterThan(0)

        // Each rewrite target should have a corresponding route
        for (const rewrite of config.rewrite || []) {
          const hasMatchingRoute = Object.keys(config.routes!).some((route) => {
            const routeBase = route.replace('/**', '')
            return rewrite.to.startsWith(routeBase.replace('/_scripts/c', COLLECT_PREFIX))
          })
          expect(
            hasMatchingRoute,
            `${key}: rewrite target "${rewrite.to}" has no matching route`,
          ).toBe(true)
        }
      }
    })
  })

  describe('synthetic URL rewrite tests', () => {
    // Test with synthetic script content to ensure all patterns work
    const syntheticScripts: Record<string, string> = {
      googleAnalytics: `
        (function() {
          // Modern GA4 endpoint
          var ga = "https://www.google.com/g/collect";
          // Legacy endpoints
          var ga2 = 'https://www.google-analytics.com/collect';
          fetch("//analytics.google.com/analytics.js");
        })();
      `,
      googleTagManager: `
        (function() {
          var gtm = "https://www.googletagmanager.com/gtm.js";
          iframe.src = 'https://www.googletagmanager.com/ns.html';
        })();
      `,
      metaPixel: `
        !function(f,b,e,v,n,t,s) {
          n.src='https://connect.facebook.net/en_US/fbevents.js';
          t.src="https://www.facebook.com/tr?id=123";
        }();
      `,
      tiktokPixel: `
        (function() {
          var url = "https://analytics.tiktok.com/i18n/pixel/events.js";
        })();
      `,
      clarity: `
        (function(c,l,a,r,i,t,y) {
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t.src="https://www.clarity.ms/tag/"+i;
        })();
      `,
      hotjar: `
        (function(h,o,t,j,a,r) {
          h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
          a.src='https://static.hotjar.com/c/hotjar-'+j+'.js?sv='+a.sv;
          r.src="https://vars.hotjar.com/vars/123.js";
        })();
      `,
      segment: `
        (function() {
          analytics.load = function(key) {
            var script = document.createElement("script");
            script.src = "https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";
            var apiHost = "https://api.segment.io/v1";
          };
        })();
      `,
    }

    it.each(Object.entries(syntheticScripts))('%s synthetic script rewrites correctly', (key, content) => {
      const config = proxyConfigs[key]
      expect(config, `Missing config for ${key}`).toBeDefined()

      const rewritten = rewriteScriptUrls(content, config.rewrite!)

      // Should have proxy paths
      expect(rewritten).toContain(COLLECT_PREFIX)

      // Should not have original domains in quoted strings
      for (const { from } of config.rewrite!) {
        expect(rewritten).not.toContain(`"https://${from}`)
        expect(rewritten).not.toContain(`'https://${from}`)
        expect(rewritten).not.toContain(`"//${from}`)
        expect(rewritten).not.toContain(`'//${from}`)
      }
    })
  })
})

/**
 * Privacy stripping E2E tests with snapshots.
 * Shows exactly what data gets through in each privacy mode.
 */
describe('privacy stripping snapshots', () => {
  // Realistic Google Analytics payload (Measurement Protocol)
  const gaPayload = {
    // Measurement protocol params
    v: '2', // Protocol version
    tid: 'G-XXXXXXX', // Tracking ID
    cid: '1234567890.1234567890', // Client ID (fingerprint)
    uid: 'user-abc-123', // User ID
    _gid: 'GA1.2.1234567890.1700000000', // Session ID

    // User info (fingerprinting)
    uip: '192.168.1.100', // User IP
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    ul: 'en-US,en;q=0.9,fr;q=0.8', // Language
    sr: '2560x1440', // Screen resolution
    vp: '1920x1080', // Viewport
    sd: '24-bit', // Screen color depth

    // Page data (should be preserved)
    dl: 'https://example.com/products/widget', // Document location
    dr: 'https://google.com/search?q=widgets', // Document referrer
    dt: 'Widget Product Page', // Document title
    dp: '/products/widget', // Document path

    // Event data (should be preserved)
    en: 'page_view', // Event name
    ep: { category: 'products', value: 100 }, // Event params
    _s: '1', // Session hit count
  }

  // Realistic Meta Pixel payload
  const metaPayload = {
    // Identifiers
    id: '123456789012345', // Pixel ID
    ev: 'PageView', // Event
    fbp: '_fbp=fb.1.1700000000.1234567890', // Browser ID
    fbc: '_fbc=fb.1.1700000000.AbCdEfGhIjKl', // Click ID
    external_id: 'user-abc-123', // External user ID

    // User data
    ud: {
      em: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', // Hashed email
      ph: 'f6e5d4c3b2a1z9y8x7w6v5u4t3s2r1q0', // Hashed phone
      fn: 'abc123def456', // Hashed first name
      ln: 'xyz789uvw012', // Hashed last name
      ct: 'newyork', // City
      st: 'ny', // State
      zp: '10001', // Zip
      country: 'us',
    },

    // Device info
    client_user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
    client_ip_address: '192.168.1.100',

    // Event data (should be preserved)
    event_time: 1700000000,
    event_source_url: 'https://example.com/checkout',
    action_source: 'website',
    custom_data: {
      currency: 'USD',
      value: 99.99,
      content_ids: ['SKU123'],
    },
  }

  // Realistic Clarity/Hotjar payload
  const sessionPayload = {
    // Session identifiers
    sid: 'session-abc-123',
    uid: 'user-xyz-789',

    // Device fingerprinting
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    sr: '1920x1080',
    vp: '1920x937',
    sd: '24',
    platform: 'Win32',
    hardwareConcurrency: 8,
    deviceMemory: 16,
    timezone: 'America/New_York',
    timezoneOffset: 300,
    plugins: ['PDF Viewer', 'Chrome PDF Viewer'],
    fonts: ['Arial', 'Helvetica', 'Times New Roman'],
    canvas: 'fp_canvas_abc123',
    webgl: {
      vendor: 'Google Inc. (NVIDIA)',
      renderer: 'ANGLE (NVIDIA GeForce RTX 3080)',
    },

    // Page data (should be preserved)
    url: 'https://example.com/dashboard',
    referrer: 'https://example.com/login',
    title: 'Dashboard',
  }

  describe('Google Analytics payload', () => {
    it('strict mode - snapshot', () => {
      const result = stripFingerprintingFromPayload(gaPayload, 'strict')
      expect(result).toMatchInlineSnapshot(`
        {
          "_s": "1",
          "dl": "https://example.com/products/widget",
          "dp": "/products/widget",
          "dr": "https://google.com/search?q=widgets",
          "dt": "Widget Product Page",
          "en": "page_view",
          "ep": {
            "category": "products",
            "value": 100,
          },
          "tid": "G-XXXXXXX",
          "ua": "Mozilla/5.0 (compatible; Chrome)",
          "ul": "en",
          "v": "2",
        }
      `)
    })

    it('anonymize mode - snapshot', () => {
      const result = stripFingerprintingFromPayload(gaPayload, 'anonymize')
      expect(result).toMatchInlineSnapshot(`
        {
          "_s": "1",
          "dl": "https://example.com/products/widget",
          "dp": "/products/widget",
          "dr": "https://google.com/search?q=widgets",
          "dt": "Widget Product Page",
          "en": "page_view",
          "ep": {
            "category": "products",
            "value": 100,
          },
          "sd": "1920x1080",
          "sr": "2560x1440",
          "tid": "G-XXXXXXX",
          "ua": "Mozilla/5.0 (compatible; Chrome)",
          "uip": "192.168.1.0",
          "ul": "en",
          "v": "2",
          "vp": "1920x1080",
        }
      `)
    })

    it('shows what gets stripped', () => {
      const strict = stripFingerprintingFromPayload(gaPayload, 'strict')
      const anonymize = stripFingerprintingFromPayload(gaPayload, 'anonymize')

      // These should be GONE in both modes
      expect(strict).not.toHaveProperty('cid') // Client ID
      expect(strict).not.toHaveProperty('uid') // User ID
      expect(strict).not.toHaveProperty('_gid') // Session ID
      expect(anonymize).not.toHaveProperty('cid')
      expect(anonymize).not.toHaveProperty('uid')
      expect(anonymize).not.toHaveProperty('_gid')

      // These should be GONE in strict, PRESENT in anonymize
      expect(strict).not.toHaveProperty('uip')
      expect(strict).not.toHaveProperty('sr')
      expect(strict).not.toHaveProperty('vp')
      expect(strict).not.toHaveProperty('sd')
      expect(anonymize).toHaveProperty('uip', '192.168.1.0') // Anonymized
      expect(anonymize).toHaveProperty('sr', '2560x1440') // Generalized
      expect(anonymize).toHaveProperty('vp', '1920x1080')

      // These should be NORMALIZED in both
      expect(strict).toHaveProperty('ua', 'Mozilla/5.0 (compatible; Chrome)')
      expect(strict).toHaveProperty('ul', 'en')
      expect(anonymize).toHaveProperty('ua', 'Mozilla/5.0 (compatible; Chrome)')
      expect(anonymize).toHaveProperty('ul', 'en')

      // These should be PRESERVED in both
      expect(strict).toHaveProperty('dl')
      expect(strict).toHaveProperty('dt')
      expect(strict).toHaveProperty('en')
      expect(anonymize).toHaveProperty('dl')
      expect(anonymize).toHaveProperty('dt')
      expect(anonymize).toHaveProperty('en')
    })
  })

  describe('Meta Pixel payload', () => {
    it('strict mode - snapshot', () => {
      const result = stripFingerprintingFromPayload(metaPayload, 'strict')
      expect(result).toMatchInlineSnapshot(`
        {
          "action_source": "website",
          "client_user_agent": "Mozilla/5.0 (compatible; Chrome)",
          "custom_data": {
            "content_ids": [
              "SKU123",
            ],
            "currency": "USD",
            "value": 99.99,
          },
          "ev": "PageView",
          "event_source_url": "https://example.com/checkout",
          "event_time": 1700000000,
          "id": "123456789012345",
        }
      `)
    })

    it('anonymize mode - snapshot', () => {
      const result = stripFingerprintingFromPayload(metaPayload, 'anonymize')
      expect(result).toMatchInlineSnapshot(`
        {
          "action_source": "website",
          "client_ip_address": "192.168.1.0",
          "client_user_agent": "Mozilla/5.0 (compatible; Chrome)",
          "custom_data": {
            "content_ids": [
              "SKU123",
            ],
            "currency": "USD",
            "value": 99.99,
          },
          "ev": "PageView",
          "event_source_url": "https://example.com/checkout",
          "event_time": 1700000000,
          "id": "123456789012345",
        }
      `)
    })

    it('shows what gets stripped', () => {
      const strict = stripFingerprintingFromPayload(metaPayload, 'strict')
      const anonymize = stripFingerprintingFromPayload(metaPayload, 'anonymize')

      // User data and identifiers GONE in both
      expect(strict).not.toHaveProperty('ud') // User data (PII)
      expect(strict).not.toHaveProperty('fbp') // Browser ID
      expect(strict).not.toHaveProperty('fbc') // Click ID
      expect(strict).not.toHaveProperty('external_id') // External ID
      expect(anonymize).not.toHaveProperty('ud')
      expect(anonymize).not.toHaveProperty('fbp')
      expect(anonymize).not.toHaveProperty('fbc')
      expect(anonymize).not.toHaveProperty('external_id')

      // IP stripped in strict, anonymized in anonymize
      expect(strict).not.toHaveProperty('client_ip_address')
      expect(anonymize).toHaveProperty('client_ip_address', '192.168.1.0')

      // Event data preserved
      expect(strict).toHaveProperty('custom_data')
      expect(strict).toHaveProperty('event_source_url')
      expect(anonymize).toHaveProperty('custom_data')
    })
  })

  describe('Session recording payload (Clarity/Hotjar)', () => {
    it('strict mode - snapshot', () => {
      const result = stripFingerprintingFromPayload(sessionPayload, 'strict')
      expect(result).toMatchInlineSnapshot(`
        {
          "referrer": "https://example.com/login",
          "title": "Dashboard",
          "ua": "Mozilla/5.0 (compatible; Chrome)",
          "url": "https://example.com/dashboard",
        }
      `)
    })

    it('anonymize mode - snapshot', () => {
      const result = stripFingerprintingFromPayload(sessionPayload, 'anonymize')
      expect(result).toMatchInlineSnapshot(`
        {
          "referrer": "https://example.com/login",
          "sd": "1920x1080",
          "sr": "1920x1080",
          "title": "Dashboard",
          "ua": "Mozilla/5.0 (compatible; Chrome)",
          "url": "https://example.com/dashboard",
          "vp": "1920x1080",
        }
      `)
    })

    it('shows what gets stripped', () => {
      const strict = stripFingerprintingFromPayload(sessionPayload, 'strict')
      const anonymize = stripFingerprintingFromPayload(sessionPayload, 'anonymize')

      // Session IDs gone
      expect(strict).not.toHaveProperty('sid')
      expect(strict).not.toHaveProperty('uid')
      expect(anonymize).not.toHaveProperty('sid')
      expect(anonymize).not.toHaveProperty('uid')

      // Platform fingerprinting gone
      expect(strict).not.toHaveProperty('platform')
      expect(strict).not.toHaveProperty('hardwareConcurrency')
      expect(strict).not.toHaveProperty('deviceMemory')
      expect(anonymize).not.toHaveProperty('platform')
      expect(anonymize).not.toHaveProperty('hardwareConcurrency')
      expect(anonymize).not.toHaveProperty('deviceMemory')

      // Browser fingerprinting gone
      expect(strict).not.toHaveProperty('plugins')
      expect(strict).not.toHaveProperty('fonts')
      expect(strict).not.toHaveProperty('canvas')
      expect(strict).not.toHaveProperty('webgl')
      expect(anonymize).not.toHaveProperty('plugins')
      expect(anonymize).not.toHaveProperty('fonts')
      expect(anonymize).not.toHaveProperty('canvas')
      expect(anonymize).not.toHaveProperty('webgl')

      // Timezone gone
      expect(strict).not.toHaveProperty('timezone')
      expect(strict).not.toHaveProperty('timezoneOffset')
      expect(anonymize).not.toHaveProperty('timezone')
      expect(anonymize).not.toHaveProperty('timezoneOffset')

      // Page context preserved
      expect(strict).toHaveProperty('url')
      expect(strict).toHaveProperty('referrer')
      expect(strict).toHaveProperty('title')
    })
  })

  describe('comparison table', () => {
    it('prints comparison of all modes', () => {
      const payloads = { ga: gaPayload, meta: metaPayload, session: sessionPayload }
      const comparisons: string[] = ['\n=== PRIVACY STRIPPING COMPARISON ===\n']

      for (const [name, payload] of Object.entries(payloads)) {
        const original = Object.keys(payload)
        const strict = Object.keys(stripFingerprintingFromPayload(payload, 'strict'))
        const anonymize = Object.keys(stripFingerprintingFromPayload(payload, 'anonymize'))

        const stripped = original.filter(k => !strict.includes(k))
        const anonymizedOnly = anonymize.filter(k => !strict.includes(k))

        comparisons.push(`--- ${name.toUpperCase()} ---`)
        comparisons.push(`Original fields (${original.length}): ${original.join(', ')}`)
        comparisons.push(`Strict output (${strict.length}): ${strict.join(', ')}`)
        comparisons.push(`Anonymize output (${anonymize.length}): ${anonymize.join(', ')}`)
        comparisons.push(`Stripped in strict: ${stripped.join(', ')}`)
        comparisons.push(`Extra in anonymize: ${anonymizedOnly.join(', ')}`)
        comparisons.push('')
      }

      // Use console.warn (allowed by linter) for visibility in test output

      console.warn(comparisons.join('\n'))

      // Snapshot the comparison for CI visibility
      expect(comparisons.join('\n')).toMatchInlineSnapshot(`
        "
        === PRIVACY STRIPPING COMPARISON ===

        --- GA ---
        Original fields (18): v, tid, cid, uid, _gid, uip, ua, ul, sr, vp, sd, dl, dr, dt, dp, en, ep, _s
        Strict output (11): v, tid, ua, ul, dl, dr, dt, dp, en, ep, _s
        Anonymize output (15): v, tid, uip, ua, ul, sr, vp, sd, dl, dr, dt, dp, en, ep, _s
        Stripped in strict: cid, uid, _gid, uip, sr, vp, sd
        Extra in anonymize: uip, sr, vp, sd

        --- META ---
        Original fields (12): id, ev, fbp, fbc, external_id, ud, client_user_agent, client_ip_address, event_time, event_source_url, action_source, custom_data
        Strict output (7): id, ev, client_user_agent, event_time, event_source_url, action_source, custom_data
        Anonymize output (8): id, ev, client_user_agent, client_ip_address, event_time, event_source_url, action_source, custom_data
        Stripped in strict: fbp, fbc, external_id, ud, client_ip_address
        Extra in anonymize: client_ip_address

        --- SESSION ---
        Original fields (18): sid, uid, ua, sr, vp, sd, platform, hardwareConcurrency, deviceMemory, timezone, timezoneOffset, plugins, fonts, canvas, webgl, url, referrer, title
        Strict output (4): ua, url, referrer, title
        Anonymize output (7): ua, sr, vp, sd, url, referrer, title
        Stripped in strict: sid, uid, sr, vp, sd, platform, hardwareConcurrency, deviceMemory, timezone, timezoneOffset, plugins, fonts, canvas, webgl
        Extra in anonymize: sr, vp, sd
        "
      `)
    })
  })
})
