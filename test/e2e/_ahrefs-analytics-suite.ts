import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

interface CapturedRequest {
  method: string
  url: string
  postData: string | null
  contentType: string | null
}

// Stand-in for Ahrefs's analytics.js. The real script bails out on
// `localhost` and on `navigator.webdriver`, which makes deterministic
// assertions impossible under Playwright + the test fixture. The stubs below
// mirror the integration shape we care about (initial pageview POST +
// history.pushState patch) and post to the *exact* endpoint each mode
// resolves to in production:
//   CDN mode      -> https://analytics.ahrefs.com/api/event
//   bundled mode  -> /_scripts/p/analytics.ahrefs.com/api/event (the path
//                    the replace-new-url-origin sdkPatch produces from the
//                    real `new URL(currentScript.src).origin + "/api/event"`)
// Splitting the two stubs (rather than reusing currentScript.src origin)
// guarantees the bundled-mode test breaks if the AST patch ever stops being
// applied to the bundle output, which is the contract this suite guards.
function buildStubAnalyticsJs(endpoint: string): string {
  return `
;(function(){
  var s = document.currentScript;
  var endpoint = ${JSON.stringify(endpoint)};
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
}

const CDN_STUB = buildStubAnalyticsJs('https://analytics.ahrefs.com/api/event')
const BUNDLED_PROXY_PATH = '/_scripts/p/analytics.ahrefs.com/api/event'

// Stub /api/event so beacon assertions are deterministic on CI. The real
// script ties the data-key to a registered domain and silently drops beacons
// from unregistered origins (e.g. localhost) and from headless/webdriver
// contexts. We also stub analytics.js itself with a minimal pageview-firing
// implementation, used in both modes:
//   CDN mode      -> intercept https://analytics.ahrefs.com/analytics.js
//   bundled mode  -> intercept /_scripts/assets/* (script body is rewritten
//                    at build time but still served as a local asset)
// Beacons land at:
//   CDN mode      -> https://analytics.ahrefs.com/api/event
//   bundled mode  -> /_scripts/p/analytics.ahrefs.com/api/event (proxy path
//                    produced by the replace-new-url-origin sdkPatch)
async function newCapturePage(opts: { bundled: boolean }) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  const requests: CapturedRequest[] = []
  // Match either endpoint shape so both modes flow through the same capture.
  await page.route(/\/api\/event(?:\?|$)/, async (route) => {
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
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: CDN_STUB })
  })
  // Bundled mode: the rewritten script is served from /_scripts/assets/*.js.
  // We don't know the hashed filename, but the suite only loads one bundled
  // SDK per fixture so any /_scripts/assets/*.js request is unambiguous. The
  // stub posts to the proxy path the real AST-rewritten script would resolve
  // to. We compute it relative to the page origin so the test stays portable.
  if (opts.bundled) {
    const bundledStub = buildStubAnalyticsJs(`${new URL(url('/')).origin}${BUNDLED_PROXY_PATH}`)
    await page.route('**/_scripts/assets/*.js', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: bundledStub })
    })
  }
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
  if (bundled) {
    // Bundled mode contract: the replace-new-url-origin sdkPatch rewrites
    // `new URL(currentScript.src).origin + "/api/event"` to the proxy path.
    // Beacons must land on the local origin AND on the proxy pathname — if
    // either part regresses, the integration silently drops user data.
    return u.origin === new URL(url('/')).origin
      && u.pathname === BUNDLED_PROXY_PATH
  }
  // CDN mode: the script is loaded from analytics.ahrefs.com so beacons go
  // directly to that host.
  return u.host === 'analytics.ahrefs.com' && u.pathname === '/api/event'
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
    const { page } = await newCapturePage(opts)
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
    const { page, requests } = await newCapturePage(opts)
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
    const { page, requests } = await newCapturePage(opts)
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

  if (opts.bundled) {
    // Fetch the *real* bundled asset (no stub) and assert the AST-rewritten
    // body. The runtime stubs above replace this asset's body before it
    // reaches the page, so without this check the suite would still pass even
    // if the replace-new-url-origin sdkPatch silently regressed. Node-side
    // fetch bypasses page.route and inspects the bundle output the build
    // actually produced.
    it('bundled asset rewrites the Ahrefs endpoint derivation through the proxy', async () => {
      const html = await fetch(url('/ahrefs')).then(r => r.text())
      const match = html.match(/\/_scripts\/assets\/[a-f0-9]+\.js/)
      expect(match, 'expected a bundled /_scripts/assets/*.js reference in the page HTML').toBeTruthy()
      const assetBody = await fetch(url(match![0])).then(r => r.text())
      // The patch turns `new URL(s.src).origin + "/api/event"` into
      // `(self.location.origin + "/_scripts/p/analytics.ahrefs.com") + "/api/event"`.
      // Both endpoints (event + error) must be rewritten; otherwise beacons
      // for one of them would silently 404 against the local origin.
      expect(assetBody).toMatch(/\(self\.location\.origin\+"\/_scripts\/p\/analytics\.ahrefs\.com"\)\+"\/api\/event"/)
      expect(assetBody).toMatch(/\(self\.location\.origin\+"\/_scripts\/p\/analytics\.ahrefs\.com"\)\+"\/api\/error"/)
      expect(assetBody, 'unrewritten origin derivation must not survive in the bundle')
        .not
        .toMatch(/new URL\([^)]*\)\.origin\s*\+\s*"\/api\/(event|error)"/)
    }, 60000)
  }
}
