import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { beforeAll, expect, it } from 'vitest'

// Probe Ahrefs egress; behavior tests skip when network is unavailable so
// CI doesn't fail in offline sandboxes. Wiring tests (script tag in DOM,
// data-key set) run regardless.
const NETWORK_PROBE_TIMEOUT_MS = 5000
async function probeAhrefsEgress(): Promise<boolean> {
  return fetch('https://analytics.ahrefs.com/analytics.js', {
    method: 'HEAD',
    signal: AbortSignal.timeout(NETWORK_PROBE_TIMEOUT_MS),
  }).then(() => true, () => false)
}

interface CapturedRequest {
  method: string
  url: string
  postData: string | null
}

async function newCapturePage() {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const requests: CapturedRequest[] = []
  page.on('request', (req) => {
    requests.push({ method: req.method(), url: req.url(), postData: req.postData() ?? null })
  })
  return { page, requests }
}

async function waitFor(
  predicate: () => boolean,
  { timeoutMs = 10000, intervalMs = 50, message = 'condition' }: { timeoutMs?: number, intervalMs?: number, message?: string } = {},
) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (predicate())
      return
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${message}`)
}

interface SuiteOptions {
  bundled: boolean
}

export function defineAhrefsAnalyticsSuite(opts: SuiteOptions) {
  let networkAvailable = false
  beforeAll(async () => {
    networkAvailable = await probeAhrefsEgress()
  })

  it('script tag points at the expected origin with data-key set', async () => {
    // Wiring assertion: the <script> is in DOM regardless of whether the
    // remote script actually executes, so this runs offline in both modes.
    const { page } = await newCapturePage()
    try {
      await page.goto(url('/ahrefs'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      const scriptSelector = opts.bundled
        ? 'script[src*="/_scripts/assets/"]'
        : 'script[src*="analytics.ahrefs.com/analytics.js"]'
      await page.waitForSelector(scriptSelector, { state: 'attached', timeout: 15000 })
      const tag = await page.evaluate((sel: string) => {
        const el = document.querySelector<HTMLScriptElement>(sel)
        return el ? { src: el.src, key: el.getAttribute('data-key') } : null
      }, scriptSelector)
      expect(tag, 'expected an Ahrefs script tag in the DOM').toBeTruthy()
      expect(tag!.key).toBe('test-ahrefs-key')
      if (opts.bundled)
        expect(tag!.src).toMatch(/\/_scripts\/assets\//)
      else
        expect(tag!.src).toMatch(/analytics\.ahrefs\.com\/analytics\.js/)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('initial page load fires a /api/event beacon', async (ctx) => {
    if (!networkAvailable)
      ctx.skip()
    const { page, requests } = await newCapturePage()
    try {
      await page.goto(url('/ahrefs'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      // In bundled mode the request is proxied through /_scripts/p/<host>/api/event;
      // in CDN mode it's a direct POST to analytics.ahrefs.com/api/event.
      const matches = () => requests.filter(r =>
        r.method === 'POST'
        && (r.url.includes('analytics.ahrefs.com/api/event') || r.url.includes('/analytics.ahrefs.com/api/event')),
      )
      await waitFor(() => matches().length > 0, { message: '/api/event beacon' })
      expect(matches().length).toBeGreaterThan(0)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('SPA navigation fires a /api/event beacon (auto-tracked by the script)', async (ctx) => {
    if (!networkAvailable)
      ctx.skip()
    // Ahrefs's analytics.js patches history.pushState natively so SPA
    // navigations fire /api/event without any composable-side hook. This
    // guards the contract: bundling/proxying must not break the patch.
    const { page, requests } = await newCapturePage()
    try {
      await page.goto(url('/ahrefs'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      const eventCount = () => requests.filter(r =>
        r.method === 'POST'
        && (r.url.includes('analytics.ahrefs.com/api/event') || r.url.includes('/analytics.ahrefs.com/api/event')),
      ).length
      // Wait for the initial event before clicking, so we measure the delta.
      await waitFor(() => eventCount() >= 1, { message: 'initial /api/event' })
      const before = eventCount()
      await page.click('#trigger-spa-nav')
      await page.waitForURL('**/', { timeout: 5000 })
      await waitFor(() => eventCount() > before, { message: 'SPA /api/event beacon' })
      expect(eventCount()).toBeGreaterThan(before)
    }
    finally {
      await page.close()
    }
  }, 60000)
}
