import { gunzipSync } from 'node:zlib'
import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { beforeAll, expect, it } from 'vitest'

// SHA-256 hex of 'test@example.com' (the email passed by setUserData below).
const EXPECTED_HASHED_EMAIL = '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b'

// Tests fall into two groups by network requirement:
//   - "wiring" tests (script tag in DOM, partner globals set by clientInit)
//     run offline — both happen before the LinkedIn script executes.
//   - "behavior" tests need the LinkedIn script to actually run, which means
//     loading from snap.licdn.com (CDN mode) and reaching px.ads.linkedin.com
//     for the bootstrap cookie-test before the canonical /collect fires.
// We probe once; behavior tests skip when egress is unavailable.
const NETWORK_PROBE_TIMEOUT_MS = 5000
async function probeLinkedInEgress(): Promise<boolean> {
  const probe = (u: string) =>
    fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(NETWORK_PROBE_TIMEOUT_MS) })
      .then(() => true, () => false)
  const results = await Promise.all([
    probe('https://snap.licdn.com/li.lms-analytics/insight.min.js'),
    probe('https://px.ads.linkedin.com/collect'),
  ])
  return results.every(Boolean)
}

interface CapturedRequest {
  method: string
  url: string
  postData: Buffer | null
}

async function newCapturePage() {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const requests: CapturedRequest[] = []
  page.on('request', (req) => {
    let data: Buffer | null = null
    try {
      const buf = req.postDataBuffer()
      data = buf ? Buffer.from(buf) : null
    }
    catch { /* ignore */ }
    requests.push({ method: req.method(), url: req.url(), postData: data })
  })
  return { page, requests }
}

// LinkedIn's payload formatter (`Pt` in insight.min.js) picks the first
// supported of: `g` = gzip(JSON) → base64; `b` = base64(JSON); `a` = JSON.
// All three are sent as text/plain; `g` and `b` are base64 strings on the
// wire, with `g` wrapping an inner gzip layer.
function decodeWaBody(req: CapturedRequest): string {
  if (!req.postData)
    return ''
  const fmt = new URL(req.url).searchParams.get('fmt')
  const text = req.postData.toString('utf8')
  if (fmt === 'g') {
    try {
      return gunzipSync(Buffer.from(text, 'base64')).toString('utf8')
    }
    catch { /* fall through */ }
  }
  if (fmt === 'b') {
    try {
      return Buffer.from(text, 'base64').toString('utf8')
    }
    catch { /* fall through */ }
  }
  return text
}

interface SuiteOptions {
  bundled: boolean
}

export function defineLinkedInInsightSuite(opts: SuiteOptions) {
  let networkAvailable = false
  beforeAll(async () => {
    networkAvailable = await probeLinkedInEgress()
  })

  it('script tag points at the expected origin', async () => {
    // Asserts on the rendered <script src> only — the tag is in DOM regardless
    // of whether the script actually loads, so this runs offline in both modes.
    const { page } = await newCapturePage()
    try {
      await page.goto(url('/linkedin'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      const scriptSelector = opts.bundled
        ? 'script[src*="/_scripts/assets/"]'
        : 'script[src*="snap.licdn.com/li.lms-analytics/insight.min.js"]'
      await page.waitForSelector(scriptSelector, { state: 'attached', timeout: 15000 })
      const scriptSrcs = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map(s => s.src),
      )
      const liScript = scriptSrcs.find(s => s.includes('insight.min.js') || s.includes('/_scripts/assets/'))
      expect(liScript, `expected a LinkedIn or bundled script tag (got ${scriptSrcs.join(', ')})`).toBeTruthy()
      if (opts.bundled)
        expect(liScript).toMatch(/\/_scripts\/assets\//)
      else
        expect(liScript).toMatch(/snap\.licdn\.com\/li\.lms-analytics\/insight\.min\.js/)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('writes partner ID globals before the script loads', async () => {
    // Globals are written by clientInit before the <script> is fetched, so this
    // runs offline. Wait on the global directly (not on #status) — clientInit
    // fires after hydration, racing against the #status element appearing.
    const { page } = await newCapturePage()
    try {
      await page.goto(url('/linkedin'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForFunction(() => (window as any)._linkedin_partner_id !== undefined, undefined, { timeout: 15000 })
      const globals = await page.evaluate(() => ({
        partnerId: (window as any)._linkedin_partner_id,
        partnerIds: (window as any)._linkedin_data_partner_ids,
        eventId: (window as any)._linkedin_event_id,
        lintrkType: typeof (window as any).lintrk,
      }))
      expect(globals.partnerId).toBe('111143')
      expect(globals.partnerIds).toEqual(['111143', '111154'])
      expect(globals.eventId).toBe('page-load-event-id-test')
      expect(globals.lintrkType).toBe('function')
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('SPA navigation fires a track beacon (auto-page-view enabled)', async (ctx) => {
    if (!networkAvailable)
      ctx.skip()
    const { page, requests } = await newCapturePage()
    try {
      await page.goto(url('/linkedin'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      const before = requests.filter(r => r.url.includes('px.ads.linkedin.com/collect')).length
      await page.click('#trigger-spa-nav')
      await page.waitForURL('**/linkedin-spa', { timeout: 5000 })
      await page.waitForTimeout(2000)
      const after = requests.filter(r => r.url.includes('px.ads.linkedin.com/collect')).length
      expect(after).toBeGreaterThan(before)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('initial page load fires exactly one canonical /collect beacon (no double-fire)', async (ctx) => {
    if (!networkAvailable)
      ctx.skip()
    // Regression guard: if we let the script's built-in auto-page-view fire
    // alongside useScriptEventPage's hook, every initial page would log two
    // page-views in LinkedIn analytics. The composable sets _wait_for_lintrk
    // to suppress the built-in fire when SPA tracking is enabled.
    //
    // Excludes cookiesTest=true and liSync=true variants (the script fires
    // those as part of its initial cookie-availability dance — not a
    // duplicate page-view).
    const { page, requests } = await newCapturePage()
    try {
      await page.goto(url('/linkedin'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      await page.waitForTimeout(2000)
      const canonicalCollects = requests.filter(r =>
        r.url.includes('px.ads.linkedin.com/collect')
        && !r.url.includes('cookiesTest=true')
        && !r.url.includes('liSync=true'),
      )
      expect(canonicalCollects.length, `expected exactly 1 canonical /collect on initial load, got ${canonicalCollects.length}: ${canonicalCollects.map(r => r.url.slice(0, 120)).join(' | ')}`).toBe(1)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('SPA navigation fires NO track beacon when enableAutoSpaTracking: false', async (ctx) => {
    if (!networkAvailable)
      ctx.skip()
    // Navigates to / (an index page that doesn't call the composable) so we
    // can observe a pure no-op route change. /collect is the page-view
    // endpoint; /attribution_trigger and /wa/ may fire as bootstrap side
    // effects regardless of SPA tracking.
    const { page, requests } = await newCapturePage()
    try {
      await page.goto(url('/linkedin-no-spa'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      const before = requests.filter(r => r.url.includes('px.ads.linkedin.com/collect')).length
      await page.click('#trigger-spa-nav')
      await page.waitForURL('**/', { timeout: 5000 })
      await page.waitForTimeout(2000)
      const after = requests.filter(r => r.url.includes('px.ads.linkedin.com/collect')).length
      expect(before).toBeGreaterThan(0)
      expect(after).toBe(before)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('lintrk(\'track\', { conversion_id }) fires a /collect with conversionId param', async (ctx) => {
    if (!networkAvailable)
      ctx.skip()
    const { page, requests } = await newCapturePage()
    try {
      await page.goto(url('/linkedin'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      const before = requests.length
      await page.click('#trigger-conversion')
      await page.waitForTimeout(2000)
      const newCollectReqs = requests.slice(before).filter(r => r.url.includes('px.ads.linkedin.com/collect'))
      expect(newCollectReqs.length).toBeGreaterThan(0)
      expect(newCollectReqs.some(r => r.url.includes('conversionId=1111111177'))).toBe(true)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('setUserData populates localStorage[li_hem] and the next page load transmits it via /wa/', async (ctx) => {
    if (!networkAvailable)
      ctx.skip()
    // setUserData hashes the email and stores it in localStorage["li_hem"].
    // The hash is transmitted in the /wa/ POST body on the *next* page load
    // (the script reads localStorage at bootstrap and includes `hem` via
    // Sr → Ir's getUserData callback).
    // newCapturePage creates a fresh BrowserContext per call, so localStorage
    // starts empty without an explicit clear.
    const { page, requests } = await newCapturePage()
    try {
      await page.goto(url('/linkedin'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      expect(await page.evaluate(() => window.localStorage.getItem('li_hem'))).toBeNull()

      await page.click('#trigger-userdata')
      await page.waitForFunction(() => window.localStorage.getItem('li_hem') !== null, { timeout: 10000 })
      expect(await page.evaluate(() => window.localStorage.getItem('li_hem'))).toBe(EXPECTED_HASHED_EMAIL)

      const reloadStart = requests.length
      await page.reload({ waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      await page.waitForTimeout(3000)
      const newRequests = requests.slice(reloadStart)

      expect(await page.evaluate(() => window.localStorage.getItem('li_hem'))).toBe(EXPECTED_HASHED_EMAIL)

      const waPosts = newRequests.filter(r => r.method === 'POST' && /\/wa\/?(?:\?|$)/.test(new URL(r.url).pathname))
      expect(waPosts.length, `expected a /wa/ POST after reload (got: ${JSON.stringify(newRequests.map(r => r.url))})`).toBeGreaterThan(0)

      const decoded = waPosts.map(decodeWaBody)
      const hits = decoded.filter(body => body.includes(EXPECTED_HASHED_EMAIL))
      expect(hits.length, `expected SHA-256 hex of test@example.com in a /wa/ body. Previews: ${decoded.map(d => d.slice(0, 100) || '<empty>').join(' | ')}`).toBeGreaterThan(0)
    }
    finally {
      await page.close()
    }
  }, 90000)
}
