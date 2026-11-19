import { createResolver } from '@nuxt/kit'
import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

describe('privatus analytics bundled script', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/privatus-analytics'),
    browser: true,
    build: true,
  })

  it('keeps the site ID and API origin on the bundled script', async () => {
    const page = await (await getBrowser()).newPage()
    try {
      await page.goto(url('/'), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 10000 })

      const script = page.locator('script[data-site="pa_test123"][data-api="https://privatusstats.com"]')
      expect(await script.count()).toBe(1)
      expect(await script.getAttribute('src')).toContain('/_scripts/assets/')

      // The bundled tracker ran from the Nuxt origin and installed its API.
      expect(await page.evaluate(() => typeof (window as any).privatus?.track)).toBe('function')
    }
    finally {
      await page.close()
    }
  })
})
