import { describe, expect, it } from 'vitest'
import { $fetch } from 'ofetch'
import { getAllProxyConfigs, rewriteScriptUrls } from '../../src/proxy-configs'

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
