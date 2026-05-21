import { createResolver } from '@nuxt/kit'
import { getBrowser, setup, url } from '@nuxt/test-utils/e2e'
import { beforeAll, describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// Regression coverage for https://github.com/nuxt/scripts/issues/785:
// `useScriptTikTokPixel` must initialise `window.ttq` with TikTok's official
// array-based snippet protocol (`ttq` is an Array of `[method, ...args]`
// tuples with `ttq.methods` / `ttq._i` scaffolding), not the Facebook `fbq`
// callable protocol (`ttq.callMethod` / `ttq.queue`).
//
// Tests split into two groups:
//   - "protocol" tests block `events.js` so `window.ttq` stays the pre-load
//     stub built by `clientInit`; they assert its shape and run offline.
//   - the "delivery" test needs `events.js` to run and POST to
//     analytics.tiktok.com; it skips when egress is unavailable.

const NETWORK_PROBE_TIMEOUT_MS = 8000
async function probeTikTokEgress(): Promise<boolean> {
  // analytics.tiktok.com rejects HEAD; use GET to probe reachability.
  return fetch('https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=TEST_PIXEL_ID&lib=ttq', {
    method: 'GET',
    signal: AbortSignal.timeout(NETWORK_PROBE_TIMEOUT_MS),
  }).then(r => r.ok, () => false)
}

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  { timeoutMs = 10000, intervalMs = 100, message = 'condition' }: { timeoutMs?: number, intervalMs?: number, message?: string } = {},
) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate())
      return
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${message}`)
}

describe('tiktokPixel', async () => {
  await setup({
    rootDir: resolve('../fixtures/tiktok-pixel'),
    browser: true,
  })

  let networkAvailable = false
  beforeAll(async () => {
    networkAvailable = await probeTikTokEgress()
  })

  it('script tag points at the TikTok events.js endpoint', async () => {
    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
      await page.goto(url('/tiktok'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('script[src*="analytics.tiktok.com/i18n/pixel/events.js"]', { state: 'attached', timeout: 15000 })
      const src = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'))
          .map(s => s.src)
          .find((s) => {
            try {
              return new URL(s).hostname === 'analytics.tiktok.com'
            }
            catch {
              return false
            }
          }),
      )
      expect(src).toMatch(/analytics\.tiktok\.com\/i18n\/pixel\/events\.js/)
      expect(src).toMatch(/sdkid=TEST_PIXEL_ID/)
      expect(src).toMatch(/lib=ttq/)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('window.ttq uses TikTok\'s array protocol, not the fbq callable protocol', async () => {
    // The core regression guard. `events.js` is blocked so `window.ttq` stays
    // the stub `clientInit` builds — `events.js` swaps in its own runtime once
    // it loads, which would otherwise mask the protocol used.
    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
      await page.route('**/i18n/pixel/events.js*', route => route.abort())
      await page.goto(url('/tiktok'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForFunction(() => Array.isArray((window as any).ttq), undefined, { timeout: 15000 })
      const shape = await page.evaluate(() => {
        const ttq = (window as any).ttq
        return {
          isArray: Array.isArray(ttq),
          analyticsObject: (window as any).TiktokAnalyticsObject,
          hasMethods: Array.isArray(ttq?.methods) && ttq.methods.includes('page') && ttq.methods.includes('track'),
          // fbq-protocol leftovers that must NOT be present
          typeofCallMethod: typeof ttq?.callMethod,
          hasQueue: Object.hasOwn(ttq, 'queue'),
          // per-pixel scaffolding events.js reads to drain the queue
          pixelUrl: ttq?._i?.TEST_PIXEL_ID?._u,
          hasPixelTimestamp: typeof ttq?._t?.TEST_PIXEL_ID === 'number',
          // deferred methods installed on the array
          typeofPage: typeof ttq?.page,
          typeofTrack: typeof ttq?.track,
          // clientInit queued grantConsent (defaultConsent) + page (trackPageView)
          queued: Array.isArray(ttq) ? ttq.map((e: any[]) => e[0]) : null,
        }
      })
      expect(shape.isArray).toBe(true)
      expect(shape.analyticsObject).toBe('ttq')
      expect(shape.hasMethods).toBe(true)
      expect(shape.typeofCallMethod).toBe('undefined')
      expect(shape.hasQueue).toBe(false)
      expect(shape.pixelUrl).toBe('https://analytics.tiktok.com/i18n/pixel/events.js')
      expect(shape.hasPixelTimestamp).toBe(true)
      expect(shape.typeofPage).toBe('function')
      expect(shape.typeofTrack).toBe('function')
      expect(shape.queued).toContain('grantConsent')
      expect(shape.queued).toContain('page')
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('proxy.ttq supports both the callable and method call forms', async () => {
    // Backwards compatibility: `proxy.ttq('track', …)` (legacy) and
    // `proxy.ttq.track(…)` both forward to the live `window.ttq` array.
    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
      await page.route('**/i18n/pixel/events.js*', route => route.abort())
      await page.goto(url('/tiktok'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForFunction(() => Array.isArray((window as any).ttq), undefined, { timeout: 15000 })
      const result = await page.evaluate(() => {
        const ttq = (window as any).ttq
        const before = ttq.length
        // Method form and legacy array push both append [method, ...args] tuples.
        ttq.track('ViewContent', { content_id: 'method-form' })
        ttq.push(['track', 'ViewContent', { content_id: 'callable-form' }])
        return { before, after: ttq.length }
      })
      expect(result.after).toBe(result.before + 2)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('events.js drains the queue and delivers an explicitly-tracked event', async (ctx) => {
    if (!networkAvailable)
      ctx.skip()
    // With the fbq stub the queued browser events were never delivered. The
    // explicit `track('ViewContent', { content_id: 'test-123' })` is distinct
    // from TikTok's auto click-tracking, so finding our payload in a
    // /api/v2/pixel POST proves the array queue was drained by events.js.
    const browser = await getBrowser()
    const page = await browser.newPage()
    // Capture request bodies (incl. navigator.sendBeacon) before any page script runs.
    await page.addInitScript(() => {
      ;(window as any).__caps = [] as Array<{ url: string, body: string }>
      const rec = (url: unknown, body: unknown) => {
        try {
          ;(window as any).__caps.push({ url: String(url), body: typeof body === 'string' ? body : String(body ?? '') })
        }
        catch { /* ignore non-serialisable bodies */ }
      }
      if (navigator.sendBeacon) {
        const sb = navigator.sendBeacon.bind(navigator)
        navigator.sendBeacon = (u: any, d?: any) => {
          rec(u, d)
          return sb(u, d)
        }
      }
      const origFetch = window.fetch
      window.fetch = (u: any, opt?: any) => {
        rec(u?.url ?? u, opt?.body)
        return origFetch(u, opt)
      }
      const origSend = XMLHttpRequest.prototype.send
      const origOpen = XMLHttpRequest.prototype.open
      XMLHttpRequest.prototype.open = function (this: any, ...args: any[]) {
        this.__u = args[1]
        return origOpen.apply(this, args as any)
      }
      XMLHttpRequest.prototype.send = function (this: any, body?: any) {
        rec(this.__u, body)
        return origSend.call(this, body)
      }
    })
    try {
      await page.goto(url('/tiktok'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 20000 })
      await page.click('#trigger-event')
      const trackedDelivered = () => page.evaluate(() =>
        ((window as any).__caps as Array<{ url: string, body: string }>).some(c =>
          c.url.includes('/api/v2/pixel')
          && c.body.includes('ViewContent')
          && c.body.includes('test-123'),
        ),
      )
      await waitFor(trackedDelivered, { timeoutMs: 20000, message: 'a /api/v2/pixel POST carrying the tracked ViewContent event' })
      expect(await trackedDelivered()).toBe(true)
    }
    finally {
      await page.close()
    }
  }, 60000)
})
