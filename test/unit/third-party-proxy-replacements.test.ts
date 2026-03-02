import { describe, expect, it } from 'vitest'
import { $fetch } from 'ofetch'
import { getAllProxyConfigs } from '../../src/proxy-configs'
import { rewriteScriptUrlsAST } from '../../src/plugins/rewrite-ast'
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
      const rewritten = rewriteScriptUrlsAST(content, 'script.js', proxyConfig.rewrite!)

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

      const rewritten = rewriteScriptUrlsAST(content, 'script.js', config.rewrite!)

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
    it('anonymize mode - snapshot', () => {
      const result = stripFingerprintingFromPayload(gaPayload)
      expect(result).toMatchInlineSnapshot(`
        {
          "_gid": "GA1.2.1234567890.1700000000",
          "_s": "1",
          "cid": "1234567890.1234567890",
          "dl": "https://example.com/products/widget",
          "dp": "/products/widget",
          "dr": "https://google.com/search?q=widgets",
          "dt": "Widget Product Page",
          "en": "page_view",
          "ep": {
            "category": "products",
            "value": 100,
          },
          "sd": "24-bit",
          "sr": "1920x1080",
          "tid": "G-XXXXXXX",
          "ua": "Mozilla/5.0 (compatible; Chrome/120.0)",
          "uid": "user-abc-123",
          "uip": "192.168.1.0",
          "ul": "en-US",
          "v": "2",
          "vp": "1920x1080",
        }
      `)
    })

    it('shows normalized fields diff', () => {
      const result = stripFingerprintingFromPayload(gaPayload)

      // What gets normalized (original -> normalized)
      expect({
        ip: { original: gaPayload.uip, normalized: result.uip },
        ua: { original: gaPayload.ua, normalized: result.ua },
        language: { original: gaPayload.ul, normalized: result.ul },
      }).toMatchInlineSnapshot(`
        {
          "ip": {
            "normalized": "192.168.1.0",
            "original": "192.168.1.100",
          },
          "language": {
            "normalized": "en-US",
            "original": "en-US,en;q=0.9,fr;q=0.8",
          },
          "ua": {
            "normalized": "Mozilla/5.0 (compatible; Chrome/120.0)",
            "original": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          },
        }
      `)

      // User IDs preserved (not normalized)
      expect(result.cid).toBe(gaPayload.cid)
      expect(result.uid).toBe(gaPayload.uid)
      expect(result._gid).toBe(gaPayload._gid)

      // Page context preserved
      expect(result.dl).toBe(gaPayload.dl)
      expect(result.dt).toBe(gaPayload.dt)
    })
  })

  describe('Meta Pixel payload', () => {
    it('anonymize mode - snapshot', () => {
      const result = stripFingerprintingFromPayload(metaPayload)
      expect(result).toMatchInlineSnapshot(`
        {
          "action_source": "website",
          "client_ip_address": "192.168.1.0",
          "client_user_agent": "Mozilla/5.0 (compatible; Chrome/120.0)",
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
          "external_id": "user-abc-123",
          "fbc": "_fbc=fb.1.1700000000.AbCdEfGhIjKl",
          "fbp": "_fbp=fb.1.1700000000.1234567890",
          "id": "123456789012345",
          "ud": {
            "country": "us",
            "ct": "newyork",
            "em": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
            "fn": "abc123def456",
            "ln": "xyz789uvw012",
            "ph": "f6e5d4c3b2a1z9y8x7w6v5u4t3s2r1q0",
            "st": "ny",
            "zp": "10001",
          },
        }
      `)
    })

    it('shows normalized fields diff', () => {
      const result = stripFingerprintingFromPayload(metaPayload)

      // What gets normalized (original -> normalized)
      expect({
        ip: { original: metaPayload.client_ip_address, normalized: result.client_ip_address },
        ua: { original: metaPayload.client_user_agent, normalized: result.client_user_agent },
      }).toMatchInlineSnapshot(`
        {
          "ip": {
            "normalized": "192.168.1.0",
            "original": "192.168.1.100",
          },
          "ua": {
            "normalized": "Mozilla/5.0 (compatible; Chrome/120.0)",
            "original": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0",
          },
        }
      `)

      // User data and IDs preserved (not normalized)
      expect(result.ud).toEqual(metaPayload.ud)
      expect(result.fbp).toBe(metaPayload.fbp)
      expect(result.fbc).toBe(metaPayload.fbc)
      expect(result.external_id).toBe(metaPayload.external_id)

      // Event data preserved
      expect(result.custom_data).toEqual(metaPayload.custom_data)
    })
  })

  describe('Session recording payload (Clarity/Hotjar)', () => {
    it('anonymize mode - snapshot', () => {
      const result = stripFingerprintingFromPayload(sessionPayload)
      expect(result).toMatchInlineSnapshot(`
        {
          "canvas": "",
          "deviceMemory": 16,
          "fonts": [],
          "hardwareConcurrency": 8,
          "platform": "Win32",
          "plugins": [],
          "referrer": "https://example.com/login",
          "sd": "24",
          "sid": "session-abc-123",
          "sr": "1920x1080",
          "timezone": "UTC",
          "timezoneOffset": 360,
          "title": "Dashboard",
          "ua": "Mozilla/5.0 (compatible; Chrome/120.0)",
          "uid": "user-xyz-789",
          "url": "https://example.com/dashboard",
          "vp": "1920x1080",
          "webgl": {},
        }
      `)
    })

    it('shows normalized fields diff', () => {
      const result = stripFingerprintingFromPayload(sessionPayload)

      // What gets normalized (original -> normalized)
      expect({
        ua: { original: sessionPayload.ua, normalized: result.ua },
        screen: { original: sessionPayload.sr, normalized: result.sr },
        viewport: { original: sessionPayload.vp, normalized: result.vp },
      }).toMatchInlineSnapshot(`
        {
          "screen": {
            "normalized": "1920x1080",
            "original": "1920x1080",
          },
          "ua": {
            "normalized": "Mozilla/5.0 (compatible; Chrome/120.0)",
            "original": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
          },
          "viewport": {
            "normalized": "1920x1080",
            "original": "1920x937",
          },
        }
      `)

      // Hardware fingerprinting anonymized (not removed)
      expect(result.platform).toBe(sessionPayload.platform) // Low entropy, kept as-is
      expect(result.hardwareConcurrency).toBe(8) // Generalized to bucket
      expect(result.deviceMemory).toBe(16) // Generalized to bucket
      expect(result.plugins).toEqual([]) // Replaced with empty
      expect(result.fonts).toEqual([]) // Replaced with empty
      expect(result.canvas).toBe('') // Replaced with empty
      expect(result.webgl).toEqual({}) // Replaced with empty
      expect(result.timezone).toBe('UTC') // Generalized to UTC
      expect(result.timezoneOffset).toBe(360) // Bucketed to 3-hour interval

      // User IDs preserved (not normalized)
      expect(result.sid).toBe(sessionPayload.sid)
      expect(result.uid).toBe(sessionPayload.uid)

      // Page context preserved
      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('referrer')
      expect(result).toHaveProperty('title')
    })
  })

  describe('comparison table', () => {
    it('prints what gets stripped vs preserved', () => {
      const payloads = { ga: gaPayload, meta: metaPayload, session: sessionPayload }
      const comparisons: string[] = ['\n=== PRIVACY STRIPPING SUMMARY ===\n']

      for (const [name, payload] of Object.entries(payloads)) {
        const original = Object.keys(payload)
        const anonymized = Object.keys(stripFingerprintingFromPayload(payload))
        const stripped = original.filter(k => !anonymized.includes(k))

        comparisons.push(`--- ${name.toUpperCase()} ---`)
        comparisons.push(`Original fields (${original.length}): ${original.join(', ')}`)
        comparisons.push(`Output fields (${anonymized.length}): ${anonymized.join(', ')}`)
        comparisons.push(`Stripped: ${stripped.join(', ')}`)
        comparisons.push('')
      }

      console.warn(comparisons.join('\n'))

      expect(comparisons.join('\n')).toMatchInlineSnapshot(`
        "
        === PRIVACY STRIPPING SUMMARY ===

        --- GA ---
        Original fields (18): v, tid, cid, uid, _gid, uip, ua, ul, sr, vp, sd, dl, dr, dt, dp, en, ep, _s
        Output fields (18): v, tid, cid, uid, _gid, uip, ua, ul, sr, vp, sd, dl, dr, dt, dp, en, ep, _s
        Stripped: 

        --- META ---
        Original fields (12): id, ev, fbp, fbc, external_id, ud, client_user_agent, client_ip_address, event_time, event_source_url, action_source, custom_data
        Output fields (12): id, ev, fbp, fbc, external_id, ud, client_user_agent, client_ip_address, event_time, event_source_url, action_source, custom_data
        Stripped: 

        --- SESSION ---
        Original fields (18): sid, uid, ua, sr, vp, sd, platform, hardwareConcurrency, deviceMemory, timezone, timezoneOffset, plugins, fonts, canvas, webgl, url, referrer, title
        Output fields (18): sid, uid, ua, sr, vp, sd, platform, hardwareConcurrency, deviceMemory, timezone, timezoneOffset, plugins, fonts, canvas, webgl, url, referrer, title
        Stripped: 
        "
      `)
    })
  })
})
