import { createResolver } from '@nuxt/kit'
import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

describe('measuremy.site analytics bundled script', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/measuremysite-analytics'),
    browser: true,
    build: true,
  })

  it('keeps the site key and event endpoint on the bundled script', async () => {
    const page = await (await getBrowser()).newPage()
    try {
      await page.goto(url('/'), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#status:has-text("loaded")', { timeout: 10000 })

      const script = page.locator('script[data-key="pk_test123"][data-api="https://a.measuremy.site/collect"]')
      expect(await script.count()).toBe(1)
      expect(await script.getAttribute('src')).toContain('/_scripts/assets/')
    }
    finally {
      await page.close()
    }
  })
})
