import { createResolver } from '@nuxt/kit'
import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

describe('metricraven analytics bundled script', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/metricraven-analytics'),
    browser: true,
    build: true,
  })

  it('keeps the site ID, event endpoint and add-on base on the bundled script', async () => {
    const page = await (await getBrowser()).newPage()
    try {
      await page.goto(url('/'), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 10000 })

      const script = page.locator('script[data-site-id="ana_pub_example"][data-api="https://metricraven.com/api/v1/collect"][data-addons="https://metricraven.com/js/addons/"]')
      expect(await script.count()).toBe(1)
      expect(await script.getAttribute('src')).toContain('/_scripts/assets/')
      // The tracker exposes its API even when it skips the visit (automated browser).
      expect(await page.evaluate(() => typeof (window as any).metricraven?.track)).toBe('function')
    }
    finally {
      await page.close()
    }
  })
})
