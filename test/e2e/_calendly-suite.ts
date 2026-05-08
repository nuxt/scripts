import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

interface SuiteOptions {
  bundled: boolean
}

async function newCapturePage(_opts: SuiteOptions) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  // The bundled and CDN-served widget.js is identical in shape; both run
  // for real in their respective fixtures. We don't stub them — we want to
  // assert the *real* artefact mounts an iframe in the requested
  // parentElement, which is the integration contract that matters. The
  // iframe's booking page itself loads from calendly.com and is blocked
  // here so the test doesn't depend on vendor uptime / per-CI egress.
  await page.route(/calendly\.com\/example\//, async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>stubbed booking</body></html>' })
  })
  return page
}

async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  { timeoutMs = 10000, intervalMs = 50, message = 'condition' }: { timeoutMs?: number, intervalMs?: number, message?: string } = {},
) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate())
      return
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${message}`)
}

export function defineCalendlySuite(opts: SuiteOptions) {
  it('script tag points at the expected origin', async () => {
    const page = await newCapturePage(opts)
    try {
      await page.goto(url('/calendly'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      const scriptSelector = opts.bundled
        ? 'script[src*="/_scripts/assets/"]'
        : 'script[src*="assets.calendly.com/assets/external/widget.js"]'
      await page.waitForSelector(scriptSelector, { state: 'attached', timeout: 15000 })
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('injects the Calendly widget stylesheet inline (no leak to assets.calendly.com)', async () => {
    // Privacy contract: PRIVACY_IP_ONLY claims no IP leaks to the vendor on
    // page load. The stylesheet used to load from
    // https://assets.calendly.com/assets/external/widget.css, which leaked
    // the user's IP every page-render — and the close-icon SVG referenced
    // inside it leaked again on every popup close. The composable now
    // injects the stylesheet inline (with the SVG as a data URI), so this
    // suite asserts both halves of that contract: the inline <style> is
    // present, and there is no link tag pointing at assets.calendly.com.
    const page = await newCapturePage(opts)
    try {
      await page.goto(url('/calendly'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('#status', { timeout: 15000 })
      const stylesheetState = await page.evaluate(() => {
        const leaks = Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]'))
          .filter(l => (l.rel === 'stylesheet' || l.as === 'style') && l.href.includes('assets.calendly.com'))
          .map(l => l.href)
        const inlineStyle = Array.from(document.querySelectorAll('style'))
          .find(s => (s.textContent || '').includes('calendly-spinner') && (s.textContent || '').includes('calendly-overlay'))
        return {
          leaks,
          hasInlineStyle: !!inlineStyle,
          inlineStyleHasDataUri: (inlineStyle?.textContent || '').includes('data:image/svg+xml'),
        }
      })
      expect(stylesheetState.leaks, `expected no link to assets.calendly.com; got ${stylesheetState.leaks.join(', ')}`).toEqual([])
      expect(stylesheetState.hasInlineStyle, 'expected an inline <style> with .calendly-spinner + .calendly-overlay rules').toBe(true)
      expect(stylesheetState.inlineStyleHasDataUri, 'expected the close-icon SVG inlined as a data URI').toBe(true)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('initInlineWidget mounts an iframe inside the requested parentElement', async () => {
    // Contract: proxy.Calendly.initInlineWidget({ url, parentElement }) must
    // append a booking iframe to the supplied parentElement, with the
    // user's URL and embed_type=Inline preserved. The composable's stub
    // queue must preserve the *full args* (regression guard for #741) so
    // calls made before script load replay correctly post-load. The
    // pre-load queue path itself is exercised by the unit test
    // `test/unit/calendly-stub-queue.test.ts`; here we drive the
    // post-load path to assert the artefact actually renders the iframe.
    const page = await newCapturePage(opts)
    try {
      await page.goto(url('/calendly'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 15000 })
      await page.click('#trigger-queue')
      await waitFor(async () => {
        return await page.evaluate(() => !!document.querySelector('#calendly-host iframe[src*="calendly.com/example/30min"]'))
      }, { message: 'inline iframe in #calendly-host' })
      const iframeSrc = await page.evaluate(() => {
        const f = document.querySelector<HTMLIFrameElement>('#calendly-host iframe')
        return f?.src ?? null
      })
      expect(iframeSrc, 'expected an iframe inside #calendly-host').toBeTruthy()
      expect(iframeSrc).toContain('calendly.com/example/30min')
      expect(iframeSrc).toContain('embed_type=Inline')
    }
    finally {
      await page.close()
    }
  }, 60000)

  if (opts.bundled) {
    // Fetch the *real* bundled asset (no stub) and assert the privacy
    // contract on the artefact itself. The runtime stubs above replace this
    // asset's body before it reaches the page, so without this check the
    // suite would still pass even if the bundle silently regressed to
    // referencing assets.calendly.com. Node-side fetch bypasses page.route
    // and inspects the bundle output the build actually produced.
    it('bundled asset exports the widget API and contains no assets.calendly.com leaks', async () => {
      const html = await fetch(url('/calendly')).then(r => r.text())
      const match = html.match(/\/_scripts\/assets\/[a-f0-9]+\.js/)
      expect(match, 'expected a bundled /_scripts/assets/*.js reference in the page HTML').toBeTruthy()
      const assetBody = await fetch(url(match![0])).then(r => r.text())
      // Must export the widget API the composable depends on.
      expect(assetBody).toMatch(/initInlineWidget/)
      expect(assetBody).toMatch(/initPopupWidget/)
      expect(assetBody).toMatch(/initBadgeWidget/)
      // Privacy contract: the bundled artefact must not embed any
      // assets.calendly.com URL — those would bypass the proxy at runtime.
      expect(assetBody, 'bundled artefact must not reference assets.calendly.com')
        .not
        .toMatch(/assets\.calendly\.com/)
    }, 60000)
  }
}
