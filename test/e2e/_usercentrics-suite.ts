import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

// The real Usercentrics loader validates the `data-settings-id` against the
// registered origin and refuses to initialise on `localhost:<random>` (CI).
// Tests stub the loader request and inject a minimal `UC_UI` shim plus
// synthesised `UC_UI_INITIALIZED` / `UC_CONSENT` events, so behavioural
// assertions run unconditionally.
async function newPage() {
  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.route('**/app.usercentrics.eu/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: '',
  }))
  await page.addInitScript(() => {
    const w = window as unknown as {
      UC_UI: Record<string, unknown>
      __ucDispatch: (action: string) => void
    }
    w.UC_UI = {
      isInitialized: () => true,
      showFirstLayer: () => {},
      showSecondLayer: () => {},
      acceptAllConsents: async () => {
        window.dispatchEvent(new CustomEvent('UC_CONSENT', {
          detail: { type: 'explicit', action: 'onAcceptAllServices' },
        }))
      },
      denyAllConsents: async () => {
        window.dispatchEvent(new CustomEvent('UC_CONSENT', {
          detail: { type: 'explicit', action: 'onDenyAllServices' },
        }))
      },
      getServicesBaseInfo: () => [],
      getCMPData: () => ({}),
    }
    // Fire init event after listeners (added in onMounted/clientInit) attach.
    setTimeout(() => window.dispatchEvent(new CustomEvent('UC_UI_INITIALIZED')), 100)
  })
  return page
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

  it('fires UC_CONSENT events that the composable surfaces via onConsentChange', async () => {
    const page = await newPage()
    try {
      await page.goto(url('/'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForFunction(() => (window as any).UC_UI?.isInitialized?.(), undefined, { timeout: 30000 })
      await page.evaluate(() => (window as any).UC_UI.acceptAllConsents())
      await page.waitForFunction(() => {
        const text = document.querySelector('#consent-events')?.textContent || ''
        const m = text.match(/events: (\d+)/)
        return !!m && Number(m[1]) > 0
      }, undefined, { timeout: 15000 })
    }
    finally {
      await page.close()
    }
  }, 90000)
}
