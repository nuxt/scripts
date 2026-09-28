import { createResolver } from '@nuxt/kit'
import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

describe('statable analytics bundled script', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/statable-analytics'),
    browser: true,
    build: true,
  })

  it('keeps the Site ID and event endpoint on the bundled script', async () => {
    const page = await (await getBrowser()).newPage()
    try {
      await page.goto(url('/'), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 10000 })

      const script = page.locator('script[data-id="123456"][data-tracking-api="https://statable.com/api/event"]')
      expect(await script.count()).toBe(1)
      expect(await script.getAttribute('src')).toContain('/_scripts/assets/')
    }
    finally {
      await page.close()
    }
  })
})
