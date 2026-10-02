import { createResolver } from '@nuxt/kit'
import { getBrowser, url, waitForHydration } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

await setupFixture({
  rootDir: resolve('../fixtures/partytown'),
  browser: true,
})

describe('partytown integration', () => {
  it('configures native Google collection while its visitor loader stays remote', async () => {
    const browser = await getBrowser()
    const page = await browser.newPage()
    const requests: string[] = []
    await page.route('https://www.googletagmanager.com/**', async (route) => {
      requests.push(route.request().url())
      await route.fulfill({
        contentType: 'application/javascript',
        body: `const config = window.dataLayer.find(row => row[0] === 'config')[2];
          fetch(config.transport_url + '/g/collect?v=2&tid=G-TEST', {
            method: 'POST', body: 'en=page_view', keepalive: true,
          }).then(() => document.documentElement.setAttribute('data-google-collected', 'yes'))`,
      })
    })
    await page.route('**/_scripts/p/www.google-analytics.com/g/collect**', async (route) => {
      requests.push(route.request().url())
      expect(route.request().postData()).toBe('en=page_view')
      await route.fulfill({ status: 204 })
    })
    try {
      await page.goto(url('/google-main'), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('html[data-google-collected="yes"]', { state: 'attached', timeout: 15000 })
      expect(requests).toEqual([
        'https://www.googletagmanager.com/gtag/js?id=G-TEST',
        url('/_scripts/p/www.google-analytics.com/g/collect?v=2&tid=G-TEST'),
      ])
    }
    finally {
      await page.close()
    }
  }, 20000)

  it('loads TikTok directly when another script enables the proxy', async () => {
    const browser = await getBrowser()
    const page = await browser.newPage()
    const requests: string[] = []
    await page.route('https://analytics.tiktok.com/**', async (route) => {
      requests.push(route.request().url())
      await route.fulfill({
        contentType: 'application/javascript',
        headers: { 'Access-Control-Allow-Origin': new URL(url('/')).origin },
        body: 'document.documentElement.setAttribute("data-tiktok-loaded", "yes")',
      })
    })
    try {
      await page.goto(url('/tiktok'), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('html[data-tiktok-loaded="yes"]', { state: 'attached', timeout: 15000 })
      const scriptType = await page.locator('script[src*="analytics.tiktok.com/i18n/pixel/events.js"]').getAttribute('type')
      expect(scriptType?.startsWith('text/partytown')).toBe(true)
      expect(requests).toEqual(['https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=TEST_PIXEL_ID&lib=ttq'])
    }
    finally {
      await page.close()
    }
  })

  it('loads explicitly configured Google loaders directly in the worker', async () => {
    const browser = await getBrowser()
    const page = await browser.newPage()
    const requests: string[] = []
    await page.route('https://www.googletagmanager.com/**', async (route) => {
      requests.push(route.request().url())
      await route.fulfill({
        contentType: 'application/javascript',
        headers: { 'Access-Control-Allow-Origin': new URL(url('/')).origin },
        body: 'document.documentElement.setAttribute("data-google-loaded", "yes")',
      })
    })
    try {
      await page.goto(url('/google'), { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('html[data-google-loaded="yes"]', { state: 'attached', timeout: 15000 })
      const scriptType = await page.locator('script[src*="www.googletagmanager.com/gtag/js"]').getAttribute('type')
      expect(scriptType?.startsWith('text/partytown')).toBe(true)
      expect(requests).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-TEST'])
    }
    finally {
      await page.close()
    }
  })

  it('script tag has type="text/partytown" when partytown option is enabled', async () => {
    const browser = await getBrowser()
    const page = await browser.newPage()

    await page.goto(url('/'), { waitUntil: 'networkidle' })
    await waitForHydration(page, '/')

    // Verify our module correctly sets the type attribute for partytown
    // Note: Partytown changes type to "text/partytown-x" after processing
    const scriptType = await page.evaluate(() => {
      const script = document.querySelector('script[src="/worker-script.js"]')
      return script?.getAttribute('type')
    })
    expect(scriptType?.startsWith('text/partytown')).toBe(true)
  })

  it('partytown library is loaded and script executes in worker', async () => {
    const browser = await getBrowser()
    const page = await browser.newPage()

    // Capture console messages to verify worker execution
    const consoleLogs: string[] = []
    page.on('console', msg => consoleLogs.push(msg.text()))

    await page.goto(url('/'), { waitUntil: 'networkidle' })
    await waitForHydration(page, '/')

    // Wait for partytown to execute scripts
    await page.waitForTimeout(1000)

    // Verify partytown library is loaded
    const partytownLib = await page.evaluate(() => {
      const scripts = [...document.querySelectorAll('script')]
      return scripts.some(s => s.id === 'partytown' || s.src?.includes('partytown'))
    })
    expect(partytownLib).toBe(true)

    // Verify our script executed in the worker (check console log)
    expect(consoleLogs.some(log => log.includes('Partytown script executing in worker'))).toBe(true)
  })
})
