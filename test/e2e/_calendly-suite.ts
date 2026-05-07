import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

interface SuiteOptions {
  bundled: boolean
}

export function defineCalendlySuite(opts: SuiteOptions) {
  it('script tag points at the expected origin', async () => {
    // The script tag is in the DOM regardless of whether it actually loads,
    // so this assertion runs offline in both bundled and CDN modes.
    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
      await page.goto(url('/calendly'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      const scriptSelector = opts.bundled
        ? 'script[src*="/_scripts/assets/"]'
        : 'script[src*="assets.calendly.com/assets/external/widget.js"]'
      await page.waitForSelector(scriptSelector, { state: 'attached', timeout: 15000 })
      const scriptSrcs = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map(s => s.src),
      )
      const cal = scriptSrcs.find(s => s.includes('widget.js') || s.includes('/_scripts/assets/'))
      expect(cal, `expected a Calendly or bundled script tag (got ${scriptSrcs.join(', ')})`).toBeTruthy()
      if (opts.bundled)
        expect(cal).toMatch(/\/_scripts\/assets\//)
      else
        expect(cal).toMatch(/assets\.calendly\.com\/assets\/external\/widget\.js/)
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('injects the Calendly widget stylesheet', async () => {
    const browser = await getBrowser()
    const page = await browser.newPage()
    try {
      await page.goto(url('/calendly'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('link[href*="assets.calendly.com/assets/external/widget.css"]', {
        state: 'attached',
        timeout: 15000,
      })
    }
    finally {
      await page.close()
    }
  }, 60000)
}
