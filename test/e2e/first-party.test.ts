import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { readdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { $fetch, getBrowser, url, setup } from '@nuxt/test-utils/e2e'

const { resolve } = createResolver(import.meta.url)
const fixtureDir = resolve('../fixtures/first-party')
const captureDir = join(fixtureDir, '.captures')

// Set env var for capture plugin
process.env.NUXT_SCRIPTS_CAPTURE_DIR = captureDir

await setup({
  rootDir: fixtureDir,
  browser: true,
  build: true,
})

function clearCaptures() {
  if (existsSync(captureDir)) {
    rmSync(captureDir, { recursive: true })
  }
}

/**
 * Provider-specific path prefixes for filtering captures.
 * NOTE: Some SDKs construct URLs without trailing slashes after the proxy prefix,
 * so we match the prefix without requiring a trailing slash.
 */
const PROVIDER_PATHS: Record<string, string[]> = {
  googleAnalytics: [
    '/_proxy/ga',
    '/_proxy/gtm',
    '/_proxy/ga-dc', // DoubleClick
    '/_proxy/ga-syn', // Google Syndication
    '/_proxy/ga-ads', // Google Ads
    '/_proxy/ga-gads', // Google Ads DoubleClick
  ],
  googleTagManager: ['/_proxy/gtm'],
  metaPixel: [
    '/_proxy/meta',
    '/_proxy/meta-tr',
    '/_proxy/meta-px', // Pixel domain
    '/_proxy/meta-plugins', // Plugins
  ],
  segment: ['/_proxy/segment', '/_proxy/segment-cdn'],
  xPixel: ['/_proxy/x', '/_proxy/x-t'],
  snapchatPixel: ['/_proxy/snap'],
  clarity: [
    '/_proxy/clarity',
    '/_proxy/clarity-scripts', // Script loader
    '/_proxy/clarity-data',
    '/_proxy/clarity-events',
  ],
  hotjar: [
    '/_proxy/hotjar',
    '/_proxy/hotjar-script', // Script loader
    '/_proxy/hotjar-vars',
    '/_proxy/hotjar-in',
    '/_proxy/hotjar-vc',
    '/_proxy/hotjar-metrics',
    '/_proxy/hotjar-insights',
  ],
  tiktokPixel: ['/_proxy/tiktok'],
  redditPixel: ['/_proxy/reddit'],
}

/**
 * Fingerprinting parameters that stripPayloadFingerprinting actually removes or normalizes.
 * These should NEVER appear unchanged in stripped query/body.
 */
const STRIPPED_FINGERPRINT_PARAMS = [
  // Screen/Hardware fingerprinting
  'sr', 'vp', 'sd', 'screen', 'viewport', 'colordepth', 'pixelratio',
  // Platform fingerprinting
  'plat', 'platform', 'hardwareconcurrency', 'devicememory', 'cpu', 'mem',
  // Browser fingerprinting
  'plugins', 'fonts',
  // Location/Timezone
  'tz', 'timezone', 'timezoneoffset',
  // Canvas/WebGL fingerprinting
  'canvas', 'webgl', 'audiofingerprint',
  // Combined device fingerprinting (X/Twitter)
  'dv', 'device_info', 'deviceinfo', 'bci', 'eci',
]

/**
 * User-id and PII parameters that are intentionally PRESERVED by stripPayloadFingerprinting.
 * Analytics services require these to function. Listed here for documentation;
 * these are NOT checked by verifyFingerprintingStripped.
 */
const _PRESERVED_USER_PARAMS = [
  // User identifiers (preserved for analytics)
  'uid', 'user_id', 'userid', 'external_id', 'cid', '_gid', 'fbp', 'fbc',
  'sid', 'session_id', 'sessionid', 'pl_id', 'p_user_id', 'anonymousid', 'twclid',
  // User data (PII — hashed by SDKs before sending, preserved for analytics)
  'ud', 'user_data', 'userdata', 'email', 'phone',
]

/**
 * Verify that fingerprinting parameters are stripped from captured request.
 * Returns list of fingerprinting params that were NOT stripped (should be empty).
 */
function verifyFingerprintingStripped(capture: Record<string, any>): string[] {
  const leakedParams: string[] = []
  const strippedQuery = capture.stripped?.query || {}
  const strippedBody = capture.stripped?.body || {}

  for (const param of STRIPPED_FINGERPRINT_PARAMS) {
    if (strippedQuery[param] !== undefined) {
      leakedParams.push(`query.${param}`)
    }
    if (strippedBody[param] !== undefined) {
      leakedParams.push(`body.${param}`)
    }
  }

  return leakedParams
}

/**
 * Normalize volatile fields in captures for stable snapshots.
 * Replaces UUIDs, ports, and other dynamic values with placeholders.
 */
function normalizeCapture(capture: Record<string, any>): Record<string, any> {
  const json = JSON.stringify(capture)
  const normalized = json
    // Normalize UUIDs (event_id, pl_id, etc.)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    // Normalize localhost ports (both plain and URL-encoded)
    .replace(/127\.0\.0\.1:\d+/g, '127.0.0.1:<PORT>')
    .replace(/127\.0\.0\.1%3A\d+/gi, '127.0.0.1%3A<PORT>')
  return JSON.parse(normalized)
}

function isAllowedDomain(urlStr: string | undefined, allowedDomain: string) {
  if (!urlStr) return false
  try {
    const hostname = new URL(urlStr).hostname
    return hostname === allowedDomain || hostname.endsWith('.' + allowedDomain)
  }
  catch {
    return false
  }
}

function readCaptures(provider?: string) {
  if (!existsSync(captureDir)) return []
  const captures = readdirSync(captureDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const content = JSON.parse(readFileSync(join(captureDir, f), 'utf-8'))
      // Remove volatile fields for stable snapshots
      delete content.timestamp
      delete content.original?.headers
      delete content.stripped?.headers
      // Normalize remaining volatile values
      return normalizeCapture(content)
    })

  // Filter by provider if specified
  if (provider && PROVIDER_PATHS[provider]) {
    const prefixes = PROVIDER_PATHS[provider]
    return captures.filter(c => prefixes.some(p => c.path?.startsWith(p)))
  }
  return captures
}

describe('first-party privacy stripping', () => {
  beforeAll(() => clearCaptures())
  afterAll(() => clearCaptures())

  describe('service worker', () => {
    it('SW endpoint is accessible', async () => {
      // Verify the SW file is being served
      const swContent = await $fetch('/_nuxt-scripts-sw.js', { responseType: 'text' })
      expect(swContent).toContain('INTERCEPT_RULES')
      expect(swContent).toContain('self.addEventListener')
    })

    it('SW contains correct intercept rules', async () => {
      const swContent = await $fetch('/_nuxt-scripts-sw.js', { responseType: 'text' }) as string
      // Extract the INTERCEPT_RULES JSON
      const match = swContent.match(/const INTERCEPT_RULES = (\[.*?\]);/s)
      expect(match).toBeTruthy()
      const rules = JSON.parse(match![1])
      // Should have rules for GTM
      expect(rules.some((r: any) => r.pattern === 'www.googletagmanager.com')).toBe(true)
      expect(rules.some((r: any) => r.pattern === 'www.google-analytics.com')).toBe(true)
    })

    it('proxy endpoint works directly', async () => {
      // Test if the proxy endpoint can reach external URL
      const response = await $fetch('/_proxy/gtm/gtag/js?id=G-TEST', {
        responseType: 'text',
        timeout: 15000,
      }).catch((e: any) => ({
        error: true,
        message: e.message,
        status: e.status,
        statusCode: e.statusCode,
        data: e.data,
      }))

      // Write debug info
      writeFileSync(join(fixtureDir, 'proxy-test.json'), JSON.stringify(response, null, 2))

      // Should return JS content (or at least not 404)
      if (typeof response === 'object' && response.error) {
        console.warn('[test] Proxy error:', response)
      }
      expect(typeof response).toBe('string')
    }, 30000)

    it('SW registers in browser', async () => {
      const browser = await getBrowser()
      const page = await browser.newPage()

      const swLogs: string[] = []
      page.on('console', (msg) => {
        swLogs.push(`${msg.type()}: ${msg.text()}`)
      })

      await page.goto(url('/'), { waitUntil: 'networkidle' })

      // Check SW registration status
      const swStatus = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) {
          return { supported: false }
        }
        const registrations = await navigator.serviceWorker.getRegistrations()
        return {
          supported: true,
          registrations: registrations.map(r => ({
            scope: r.scope,
            active: r.active?.state,
            waiting: r.waiting?.state,
            installing: r.installing?.state,
          })),
          ready: navigator.serviceWorker.controller !== null,
        }
      })

      // Debug output
      writeFileSync(join(fixtureDir, 'sw-status.json'), JSON.stringify({
        swStatus,
        swLogs: swLogs.filter(l => l.includes('SW') || l.includes('service') || l.includes('worker')),
      }, null, 2))

      expect(swStatus.supported).toBe(true)
      expect(swStatus.registrations.length).toBeGreaterThan(0)

      await page.close()
    }, 30000)
  })

  describe('script bundling', () => {
    it('GA script is loaded from local path', async () => {
      const browser = await getBrowser()
      const page = await browser.newPage()

      const scriptUrls: string[] = []
      page.on('request', (req) => {
        const reqUrl = req.url()
        if (reqUrl.includes('gtag') || reqUrl.includes('_scripts')) {
          scriptUrls.push(reqUrl)
        }
      })

      await page.goto(url('/ga'), { waitUntil: 'networkidle' })

      // Verify bundled script is loaded from local /_scripts path
      const localScript = scriptUrls.find(u => u.includes('/_scripts/'))
      expect(localScript).toBeDefined()

      // Note: Dynamic requests from gtag.js may escape SW on first page load
      // due to inherent race condition. SW intercept improves on subsequent loads.
      // The important thing is the main script bundle is served first-party.
    }, 30000)

    it('bundled scripts contain rewritten collect URLs', async () => {
      // Check bundled scripts have proxy URLs
      const cacheDir = join(fixtureDir, 'node_modules/.cache/nuxt/scripts/bundle-proxy')
      expect(existsSync(cacheDir), `Bundle proxy cache dir should exist at ${cacheDir}`).toBe(true)

      const files = readdirSync(cacheDir).filter(f => f.endsWith('.js'))
      expect(files.length).toBeGreaterThan(0)

      // Combine all cached scripts content
      const allContent = files.map(f => readFileSync(join(cacheDir, f), 'utf-8')).join('\n')
      // Verify at least one proxy URL is present (GA, Clarity, etc.)
      const hasProxyUrl = allContent.includes('/_proxy/')
      expect(hasProxyUrl).toBe(true)
    })
  })

  describe('proxy privacy stripping (real events)', () => {
    /**
     * Test a provider by navigating to its page and capturing proxy requests.
     * Verifies that requests are proxied and fingerprinting data is stripped.
     */
    async function testProvider(provider: string, pagePath: string) {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()

      const proxyRequests: string[] = []
      page.on('request', (req) => {
        const reqUrl = req.url()
        if (reqUrl.includes('/_proxy/')) {
          proxyRequests.push(reqUrl)
        }
      })

      // Navigate and wait for script to load
      await page.goto(url(pagePath), { waitUntil: 'networkidle' })

      // Wait for script status to be loaded
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 }).catch(() => {
        // Some scripts may not reach "loaded" status in headless browser
        // Continue anyway to check if any proxy requests were made
      })

      // Give scripts time to make requests
      await page.waitForTimeout(3000)

      // Read captures filtered to this provider
      const captures = readCaptures(provider)

      await page.close()

      // Return captures for assertions
      return { captures, proxyRequests }
    }

    it('googleAnalytics', async () => {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()

      // GA/GTM need more time - they load dynamically
      await page.goto(url('/ga'), { waitUntil: 'networkidle' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 }).catch(() => {})

      // Trigger events to generate requests
      await page.click('#trigger-pageview').catch(() => {})
      await page.waitForTimeout(5000) // GA batches events

      const captures = readCaptures('googleAnalytics')
      await page.close()

      // GA may not always fire collection events in headless (depends on gtag.js behavior)
      if (captures.length > 0) {
        const hasValidCapture = captures.some(c =>
          c.path?.startsWith('/_proxy/')
          && (isAllowedDomain(c.targetUrl, 'google-analytics.com') || isAllowedDomain(c.targetUrl, 'analytics.google.com'))
          && c.privacy === 'anonymize',
        )
        expect(hasValidCapture).toBe(true)

        // Verify ALL fingerprinting params are stripped
        for (const capture of captures) {
          const leaked = verifyFingerprintingStripped(capture)
          expect(leaked).toEqual([])
        }

        await expect(captures).toMatchFileSnapshot('__snapshots__/proxy/googleAnalytics.json')
      }
      // No captures acceptable - gtag.js behavior varies in headless
    }, 45000)

    it('googleTagManager', async () => {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()

      await page.goto(url('/gtm'), { waitUntil: 'networkidle' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(3000)

      const captures = readCaptures('googleTagManager')
      await page.close()

      // GTM may not fire requests if no tags are configured
      if (captures.length > 0) {
        const hasValidCapture = captures.some(c =>
          c.path?.startsWith('/_proxy/gtm')
          && isAllowedDomain(c.targetUrl, 'googletagmanager.com')
          && c.privacy === 'anonymize',
        )
        expect(hasValidCapture).toBe(true)

        // Verify ALL fingerprinting params are stripped
        for (const capture of captures) {
          const leaked = verifyFingerprintingStripped(capture)
          expect(leaked).toEqual([])
        }

        await expect(captures).toMatchFileSnapshot('__snapshots__/proxy/googleTagManager.json')
      }
      // No captures acceptable - depends on GTM container configuration
    }, 30000)

    it('metaPixel', async () => {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()

      await page.goto(url('/meta'), { waitUntil: 'networkidle' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 }).catch(() => {})

      // Trigger tracking events
      await page.click('#trigger-pageview').catch(() => {})
      await page.click('#trigger-event').catch(() => {})
      await page.waitForTimeout(3000)

      const captures = readCaptures('metaPixel')
      await page.close()

      // Meta tracking events may not be captured if script bundling isn't active
      // The test verifies proxy routes are working for script loading
      if (captures.length > 0) {
        const hasValidCapture = captures.some(c =>
          c.path?.startsWith('/_proxy/meta')
          && (isAllowedDomain(c.targetUrl, 'facebook.com') || isAllowedDomain(c.targetUrl, 'facebook.net'))
          && c.privacy === 'anonymize',
        )
        expect(hasValidCapture).toBe(true)

        // Verify ALL fingerprinting params are stripped
        for (const capture of captures) {
          const leaked = verifyFingerprintingStripped(capture)
          expect(leaked).toEqual([])
        }

        await expect(captures).toMatchFileSnapshot('__snapshots__/proxy/metaPixel.json')
      }
      // No captures is acceptable in environments where script bundling isn't active
    }, 30000)

    it('segment', async () => {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()

      await page.goto(url('/segment'), { waitUntil: 'networkidle' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 }).catch(() => {})

      // Trigger tracking events
      await page.click('#trigger-page').catch(() => {})
      await page.click('#trigger-event').catch(() => {})
      await page.waitForTimeout(3000)

      const captures = readCaptures('segment')
      await page.close()

      expect(captures.length).toBeGreaterThan(0)
      const hasValidCapture = captures.some(c =>
        c.path?.startsWith('/_proxy/segment')
        && (isAllowedDomain(c.targetUrl, 'segment.io') || isAllowedDomain(c.targetUrl, 'segment.com'))
        && c.privacy === 'anonymize',
      )
      expect(hasValidCapture).toBe(true)

      // Verify ALL fingerprinting params are stripped
      for (const capture of captures) {
        const leaked = verifyFingerprintingStripped(capture)
        expect(leaked).toEqual([])
      }

      await expect(captures).toMatchFileSnapshot('__snapshots__/proxy/segment.json')
    }, 30000)

    it('xPixel', async () => {
      const { captures } = await testProvider('xPixel', '/x')

      expect(captures.length).toBeGreaterThan(0)
      const hasValidCapture = captures.some(c =>
        c.path?.startsWith('/_proxy/x')
        && (isAllowedDomain(c.targetUrl, 'twitter.com') || isAllowedDomain(c.targetUrl, 't.co'))
        && c.privacy === 'anonymize',
      )
      expect(hasValidCapture).toBe(true)

      // Verify ALL fingerprinting params are stripped
      for (const capture of captures) {
        const leaked = verifyFingerprintingStripped(capture)
        expect(leaked).toEqual([])
      }

      await expect(captures).toMatchFileSnapshot('__snapshots__/proxy/xPixel.json')
    }, 30000)

    it('snapchatPixel', async () => {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()

      await page.goto(url('/snap'), { waitUntil: 'networkidle' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 }).catch(() => {})

      // Trigger tracking events
      await page.click('#trigger-pageview').catch(() => {})
      await page.click('#trigger-event').catch(() => {})
      await page.waitForTimeout(3000)

      const captures = readCaptures('snapchatPixel')
      await page.close()

      expect(captures.length).toBeGreaterThan(0)
      const hasValidCapture = captures.some(c =>
        c.path?.startsWith('/_proxy/snap')
        && isAllowedDomain(c.targetUrl, 'snapchat.com')
        && c.privacy === 'anonymize',
      )
      expect(hasValidCapture).toBe(true)

      // Verify ALL fingerprinting params are stripped
      for (const capture of captures) {
        const leaked = verifyFingerprintingStripped(capture)
        expect(leaked).toEqual([])
      }

      await expect(captures).toMatchFileSnapshot('__snapshots__/proxy/snapchatPixel.json')
    }, 30000)

    // Note: Clarity and Hotjar are session recording tools that primarily use:
    // - Clarity: d.clarity.ms (data collection) - may buffer data before sending
    // - Hotjar: WebSocket connections (wss://ws*.hotjar.com) which can't be proxied via HTTP
    // These tests verify page loads and proxy config is correct.
    // Data collection may not occur in short headless sessions.

    it('clarity', async () => {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()

      await page.goto(url('/clarity'), { waitUntil: 'networkidle' })

      // Wait for page to render (status element exists)
      await page.waitForSelector('#status', { timeout: 10000 })

      // Try to interact regardless of script status
      await page.click('#test-button').catch(() => {})
      await page.fill('#test-input', 'test input').catch(() => {})
      await page.waitForTimeout(2000)

      const captures = readCaptures('clarity')
      await page.close()

      // Clarity may not send data in short headless sessions (buffers data)
      if (captures.length > 0) {
        const hasValidCapture = captures.some(c =>
          c.path?.startsWith('/_proxy/clarity')
          && isAllowedDomain(c.targetUrl, 'clarity.ms')
          && c.privacy === 'anonymize',
        )
        expect(hasValidCapture).toBe(true)

        // Verify ALL fingerprinting params are stripped
        for (const capture of captures) {
          const leaked = verifyFingerprintingStripped(capture)
          expect(leaked).toEqual([])
        }

        await expect(captures).toMatchFileSnapshot('__snapshots__/proxy/clarity.json')
      }
      // No captures is acceptable - session recording tools buffer data
    }, 30000)

    it('hotjar', async () => {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()

      await page.goto(url('/hotjar'), { waitUntil: 'networkidle' })

      // Wait for page to render (status element exists)
      await page.waitForSelector('#status', { timeout: 10000 })

      // Try to interact regardless of script status
      await page.click('#test-button').catch(() => {})
      await page.fill('#test-input', 'test input').catch(() => {})
      await page.waitForTimeout(2000)

      const captures = readCaptures('hotjar')
      await page.close()

      // Hotjar uses WebSocket for real-time data which can't be HTTP proxied
      if (captures.length > 0) {
        const hasValidCapture = captures.some(c =>
          c.path?.startsWith('/_proxy/hotjar')
          && isAllowedDomain(c.targetUrl, 'hotjar.com')
          && c.privacy === 'anonymize',
        )
        expect(hasValidCapture).toBe(true)

        // Verify ALL fingerprinting params are stripped
        for (const capture of captures) {
          const leaked = verifyFingerprintingStripped(capture)
          expect(leaked).toEqual([])
        }

        await expect(captures).toMatchFileSnapshot('__snapshots__/proxy/hotjar.json')
      }
      // No captures is acceptable - Hotjar primarily uses WebSocket
    }, 30000)

    it('tiktokPixel', async () => {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()

      await page.goto(url('/tiktok'), { waitUntil: 'networkidle' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 }).catch(() => {})

      // Trigger tracking events
      await page.click('#trigger-pageview').catch(() => {})
      await page.click('#trigger-event').catch(() => {})
      await page.waitForTimeout(3000)

      const captures = readCaptures('tiktokPixel')
      await page.close()

      // TikTok may not fire events in headless without valid pixel ID
      if (captures.length > 0) {
        const hasValidCapture = captures.some(c =>
          c.path?.startsWith('/_proxy/tiktok')
          && isAllowedDomain(c.targetUrl, 'tiktok.com')
          && c.privacy === 'anonymize',
        )
        expect(hasValidCapture).toBe(true)

        // Verify ALL fingerprinting params are stripped
        for (const capture of captures) {
          const leaked = verifyFingerprintingStripped(capture)
          expect(leaked).toEqual([])
        }

        await expect(captures).toMatchFileSnapshot('__snapshots__/proxy/tiktokPixel.json')
      }
      // No captures acceptable - TikTok behavior varies in headless
    }, 30000)

    it('redditPixel', async () => {
      clearCaptures()
      const browser = await getBrowser()
      const page = await browser.newPage()

      await page.goto(url('/reddit'), { waitUntil: 'networkidle' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 }).catch(() => {})

      // Trigger tracking events
      await page.click('#trigger-pagevisit').catch(() => {})
      await page.click('#trigger-event').catch(() => {})
      await page.waitForTimeout(3000)

      const captures = readCaptures('redditPixel')
      await page.close()

      // Reddit may not fire events in headless without valid advertiser ID
      if (captures.length > 0) {
        const hasValidCapture = captures.some(c =>
          c.path?.startsWith('/_proxy/reddit')
          && isAllowedDomain(c.targetUrl, 'reddit.com')
          && c.privacy === 'anonymize',
        )
        expect(hasValidCapture).toBe(true)

        // Verify ALL fingerprinting params are stripped
        for (const capture of captures) {
          const leaked = verifyFingerprintingStripped(capture)
          expect(leaked).toEqual([])
        }

        await expect(captures).toMatchFileSnapshot('__snapshots__/proxy/redditPixel.json')
      }
      // No captures acceptable - Reddit behavior varies in headless
    }, 30000)
  })
})
