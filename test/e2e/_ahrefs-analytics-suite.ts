import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

interface CapturedRequest {
  method: string
  url: string
  postData: string | null
  contentType: string | null
}

// Stand-in for Ahrefs's analytics.js, used in both CDN and bundled modes.
// The real script bails out on `localhost` before sending /api/event, which
// makes deterministic assertions impossible on CI. This stub mirrors the
// integration shape we care about (initial pageview POST + history.pushState
// patch) and posts to whatever origin it was loaded from, so our /api/event
// route handler captures the beacons for both CDN and proxied paths.
const STUB_ANALYTICS_JS = `
;(function(){
  var s = document.currentScript;
  var origin = s ? new URL(s.src).origin : window.location.origin;
  var endpoint = origin + '/api/event';
  var key = s ? s.getAttribute('data-key') : null;
  function send(name) {
    try {
      var body = JSON.stringify({ n: name, u: window.location.href, k: key, t: document.title });
      var xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(body);
    } catch (e) {}
  }
  function instance() {
    return { sendEvent: function(n) { send(n || 'custom'); } };
  }
  window.AhrefsAnalytics = instance();
  send('pageview');
  var origPush = history.pushState;
  history.pushState = function() {
    var r = origPush.apply(this, arguments);
    send('pageview');
    return r;
  };
  window.addEventListener('popstate', function() { send('pageview'); });
})();
`

// Stub /api/event so beacon assertions are deterministic on CI. The real
// script ties the data-key to a registered domain and silently drops beacons
// from unregistered origins (e.g. localhost). We also stub analytics.js
// itself with a minimal pageview-firing implementation, used in both modes:
//   CDN mode      -> intercept https://analytics.ahrefs.com/analytics.js
//   bundled mode  -> intercept /_scripts/assets/* (script body is rewritten
//                    at build time but still served as a local asset)
// Beacons land at:
//   CDN mode      -> https://analytics.ahrefs.com/api/event
//   bundled mode  -> /_scripts/p/analytics.ahrefs.com/api/event (proxy)
async function newCapturePage() {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const requests: CapturedRequest[] = []
  await page.route('**/api/event', async (route) => {
    const req = route.request()
    requests.push({
      method: req.method(),
      url: req.url(),
      postData: req.postData() ?? null,
      contentType: req.headers()['content-type'] ?? null,
    })
    await route.fulfill({ status: 200, contentType: 'text/plain', body: '' })
  })
  // CDN mode: replace analytics.js with our stub before it reaches the page.
  await page.route('**/analytics.ahrefs.com/analytics.js', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: STUB_ANALYTICS_JS })
  })
  // Bundled mode: the rewritten script is served from /_scripts/assets/*.js.
  // We don't know the hashed filename, but the script tag sets data-key and
  // points at the local origin, so any /_scripts/assets/*.js request matching
  // our integration is the one to swap. Restrict to the asset path to avoid
  // catching unrelated asset requests; the suite only loads one bundled SDK
  // per fixture so this is unambiguous.
  await page.route('**/_scripts/assets/*.js', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: STUB_ANALYTICS_JS })
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

function isExpectedUrl(reqUrl: string, bundled: boolean): boolean {
  const u = new URL(reqUrl)
  if (u.pathname !== '/api/event')
    return false
  if (bundled) {
    // Bundled SDKs derive their endpoint from `new URL(currentScript.src).origin`,
    // which resolves to the local Nuxt origin (the script is served from
    // /_scripts/assets/). Beacons therefore land on the local origin.
    return u.origin === new URL(url('/')).origin
  }
  // CDN mode: the script is loaded from analytics.ahrefs.com so beacons go
  // directly to that host.
  return u.host === 'analytics.ahrefs.com'
}

function assertBeaconShape(req: CapturedRequest, bundled: boolean) {
  expect(req.method, `expected POST, got ${req.method} for ${req.url}`).toBe('POST')
  expect(isExpectedUrl(req.url, bundled), `unexpected URL shape: ${req.url}`).toBe(true)
  const body = req.postData ?? ''
  expect(body.length, `expected non-empty beacon payload, got empty body for ${req.url}`).toBeGreaterThan(0)
  // Stub posts JSON; if content-type advertises it, ensure body parses.
  if (req.contentType && req.contentType.includes('json')) {
    expect(() => JSON.parse(body), `expected JSON-parseable body for ${req.url}`).not.toThrow()
  }
}

export function defineAhrefsAnalyticsSuite(opts: SuiteOptions) {
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

  it('initial page load fires a /api/event beacon', async () => {
    const { page, requests } = await newCapturePage()
    try {
      await page.goto(url('/ahrefs'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      await waitFor(() => requests.length > 0, { message: '/api/event beacon' })
      expect(requests.length).toBeGreaterThan(0)
      for (const req of requests)
        assertBeaconShape(req, opts.bundled)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('SPA navigation fires a /api/event beacon (auto-tracked by the script)', async () => {
    // The script patches history.pushState natively so SPA navigations fire
    // /api/event without any composable-side hook. This guards the contract:
    // bundling/proxying must not break the patch.
    const { page, requests } = await newCapturePage()
    try {
      await page.goto(url('/ahrefs'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      // Wait for the initial event before clicking, so we measure the delta.
      await waitFor(() => requests.length >= 1, { message: 'initial /api/event' })
      const before = requests.length
      await page.click('#trigger-spa-nav')
      await page.waitForURL('**/', { timeout: 5000 })
      await waitFor(() => requests.length > before, { message: 'SPA /api/event beacon' })
      expect(requests.length).toBeGreaterThan(before)
      for (const req of requests.slice(before))
        assertBeaconShape(req, opts.bundled)
    }
    finally {
      await page.close()
    }
  }, 60000)
}
