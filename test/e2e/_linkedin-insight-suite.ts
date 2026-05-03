import { gunzipSync } from 'node:zlib'
import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

// SHA-256 hex of 'test@example.com' (the email passed by setUserData below).
const EXPECTED_HASHED_EMAIL = '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b'

interface CapturedRequest {
  method: string
  url: string
  postData: Buffer | null
}

// Tests make real outbound HTTPS to snap.licdn.com and px.ads.linkedin.com.
// In sandboxed environments without that egress, the script never loads and
// these assertions all fail with "expected 0 to be greater than 0".
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
  it('script tag points at the expected origin', async () => {
    const { page } = await newCapturePage()
    try {
      await page.goto(url('/linkedin'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
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
    const { page } = await newCapturePage()
    try {
      await page.goto(url('/linkedin'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('#status', { timeout: 15000 })
      const globals = await page.evaluate(() => ({
        partnerId: (window as any)._linkedin_partner_id,
        partnerIds: (window as any)._linkedin_data_partner_ids,
        eventId: (window as any)._linkedin_event_id,
        lintrkType: typeof (window as any).lintrk,
      }))
      expect(globals.partnerId).toBe('541681')
      expect(globals.partnerIds).toEqual(['541681', '987654'])
      expect(globals.eventId).toBe('page-load-event-id-test')
      expect(globals.lintrkType).toBe('function')
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('SPA navigation fires a track beacon (auto-page-view enabled)', async () => {
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

  it('initial page load fires exactly one canonical /collect beacon (no double-fire)', async () => {
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

  it('SPA navigation fires NO track beacon when enableAutoSpaTracking: false', async () => {
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

  it('lintrk(\'track\', { conversion_id }) fires a /collect with conversionId param', async () => {
    const { page, requests } = await newCapturePage()
    try {
      await page.goto(url('/linkedin'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      const before = requests.length
      await page.click('#trigger-conversion')
      await page.waitForTimeout(2000)
      const newCollectReqs = requests.slice(before).filter(r => r.url.includes('px.ads.linkedin.com/collect'))
      expect(newCollectReqs.length).toBeGreaterThan(0)
      expect(newCollectReqs.some(r => r.url.includes('conversionId=20529377'))).toBe(true)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('setUserData populates localStorage[li_hem] and the next page load transmits it via /wa/', async () => {
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
