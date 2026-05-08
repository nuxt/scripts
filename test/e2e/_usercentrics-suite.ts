import { getBrowser, url } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

// The real Usercentrics CMP v3 loader validates `data-ruleset-id` against
// registered domains and silently no-ops on unknown origins. Tests stub the
// loader request and inject a minimal `__ucCmp` shim plus synthesised
// `UC_CMP_API_READY` / `UC_UI_CMP_EVENT` events, so behavioural assertions
// run unconditionally on CI.
async function newPage() {
  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.route('**/web.cmp.usercentrics.eu/**', route => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: '',
  }))
  await page.addInitScript(() => {
    const w = window as unknown as { __ucCmp: Record<string, unknown> }
    w.__ucCmp = {
      isInitialized: async () => true,
      isConsentRequired: async () => true,
      showFirstLayer: async () => {},
      showSecondLayer: async () => {},
      acceptAllConsents: async () => {
        window.dispatchEvent(new CustomEvent('UC_UI_CMP_EVENT', {
          detail: { type: 'ACCEPT_ALL', source: 'explicit' },
        }))
      },
      denyAllConsents: async () => {
        window.dispatchEvent(new CustomEvent('UC_UI_CMP_EVENT', {
          detail: { type: 'DENY_ALL', source: 'explicit' },
        }))
      },
      getConsentDetails: async () => ({}),
      getControllerId: async () => 'test-controller',
      getActiveLanguage: async () => 'en',
    }
    setTimeout(() => window.dispatchEvent(new CustomEvent('UC_CMP_API_READY')), 100)
  })
  return page
}

export function defineUsercentricsSuite() {
  it('renders the v3 loader script tag with id + data-ruleset-id', async () => {
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
          rulesetId: el.getAttribute('data-ruleset-id'),
        }
      })
      expect(attrs).not.toBeNull()
      expect(attrs!.src).toBe('https://web.cmp.usercentrics.eu/ui/loader.js')
      expect(attrs!.rulesetId).toBe('test-ruleset-id')
    }
    finally {
      await page.close()
    }
  }, 60000)

  it('fires UC_UI_CMP_EVENT events that the composable surfaces via onConsentChange', async () => {
    const page = await newPage()
    try {
      await page.goto(url('/'), { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForFunction(() => typeof (window as any).__ucCmp === 'object', undefined, { timeout: 30000 })
      await page.evaluate(() => (window as any).__ucCmp.acceptAllConsents())
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

  // Contract test: the live loader URL still serves a body that wires the v3
  // globals/events we ship against. If Usercentrics changes any of these, the
  // integration breaks even though the stubbed behavioural tests above still
  // pass. Skipped on offline CI (network failure is tolerated, not asserted).
  it('live loader URL still serves a body that wires __ucCmp + UC_CMP_API_READY', async () => {
    const res = await fetch('https://web.cmp.usercentrics.eu/ui/loader.js').catch(() => null)
    if (!res || !res.ok) {
      console.warn('[usercentrics] skipping live-loader contract check; fetch failed')
      return
    }
    const body = await res.text()
    expect(body).toMatch(/UC_CMP_API_READY/)
    expect(body).toMatch(/__ucCmp/)
  }, 30000)
}
