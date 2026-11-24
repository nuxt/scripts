import { createResolver } from '@nuxt/kit'
import { createPage, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

describe('bundled registry validation', { timeout: 120000 }, async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/bundled-validation'),
    browser: true,
    browserOptions: { type: 'chromium', launch: { headless: true } },
    dev: true,
  })

  it('skips a bundled script with invalid options', async () => {
    const page = await createPage()
    try {
      const logs: string[] = []
      page.on('console', message => logs.push(message.text()))
      await page.goto(url('/'), { waitUntil: 'hydration' })
      expect(await page.textContent('#status')).toBe('awaitingLoad')
      expect(await page.locator('script[data-cf-beacon]').count()).toBe(0)
      expect(logs.some(log => log.includes('Skipping script `cloudflareWebAnalytics` due to invalid options'))).toBe(true)
    }
    finally {
      await page.close()
    }
  })

  it.each(['?valid=1', '?custom=1'])('loads the script for %s', async (query) => {
    const page = await createPage()
    try {
      await page.goto(url(`/${query}`), { waitUntil: 'hydration' })
      await expect.poll(() => page.textContent('#status')).toBe('loaded')
    }
    finally {
      await page.close()
    }
  })
})
