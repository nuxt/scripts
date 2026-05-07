import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

// Usercentrics requires a valid `settingsId` tied to a real account to fully
// boot. CI uses a placeholder ID, so behavioural assertions (UC_UI globals,
// UC_CONSENT events) skip; only DOM-wiring assertions run unconditionally.
const HAS_REAL_SETTINGS_ID = !!process.env.USERCENTRICS_TEST_SETTINGS_ID

async function newPage() {
  const browser = await getBrowser()
  return browser.newPage()
}

export function defineUsercentricsSuite() {
  it('renders the loader script tag with id + data-settings-id', async () => {
    const page = await newPage()
    try {
      await page.goto(url('/'), { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('script#usercentrics-cmp', { state: 'attached', timeout: 15000 })
      const attrs = await page.evaluate(() => {
        const el = document.getElementById('usercentrics-cmp') as HTMLScriptElement | null
        if (!el)
          return null
        return {
          src: el.src,
          settingsId: el.getAttribute('data-settings-id'),
        }
      })
      expect(attrs).not.toBeNull()
      expect(attrs!.src).toMatch(/app\.usercentrics\.eu\/browser-ui\/.+\/loader\.js$/)
      expect(attrs!.settingsId).toBe('test-settings-id')
    }
    finally {
      await page.close()
    }
  }, 60000)

  it.skipIf(!HAS_REAL_SETTINGS_ID)(
    'fires UC_CONSENT events that the composable surfaces via onConsentChange',
    async () => {
      const page = await newPage()
      try {
        await page.goto(url('/'), { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForFunction(() => (window as any).UC_UI?.isInitialized?.(), undefined, { timeout: 30000 })
        await page.evaluate(() => (window as any).UC_UI.acceptAllConsents())
        await page.waitForFunction(() => {
          const text = document.querySelector('#consent-events')?.textContent || ''
          const m = text.match(/events: (\d+)/)
          return m && Number(m[1]) > 0
        }, undefined, { timeout: 15000 })
      }
      finally {
        await page.close()
      }
    },
    90000,
  )
}
