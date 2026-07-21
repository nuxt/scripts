import type { Page } from 'playwright-core'
import { getBrowser, url, waitForHydration } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

interface LuxCall { method: string, args: unknown[] }

async function scPage(path: string) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  await page.route('**/cdn.speedcurve.com/**', r => r.abort())
  const targetUrl = url(path)
  await page.goto(targetUrl)
  await waitForHydration(page, targetUrl)
  return { page }
}

async function getLuxCalls(page: Page): Promise<LuxCall[]> {
  return page.evaluate(() => (window as any)._luxCalls as LuxCall[])
}

async function waitForLuxCall(page: Page, method: string, timeoutMs = 5000) {
  await page.waitForFunction(
    (m: string) => ((window as any)._luxCalls as LuxCall[])?.some(c => c.method === m),
    method,
    { timeout: timeoutMs },
  )
}

export function defineSpeedCurveSuite() {
  it('primer: injects LUX into <head> with correct snippetVersion', async () => {
    const { page } = await scPage('/tpc/speedcurve')

    const snippetVersion = await page.evaluate(
      () => (window as any).LUX?.snippetVersion,
    )
    expect(snippetVersion).toBeTruthy()
    expect(String(snippetVersion)).toMatch(/^\d+\.\d+/)
  })

  it('SPA auto: calls startSoftNavigation when navigating to a new route', async () => {
    const { page } = await scPage('/tpc/speedcurve')

    await page.click('#nav-destination')
    await page.waitForSelector('#page')

    await waitForLuxCall(page, 'startSoftNavigation')
    const calls = await getLuxCalls(page)
    const softNavCalls = calls.filter(c => c.method === 'startSoftNavigation')
    expect(softNavCalls).toHaveLength(1)
  })

  it('SPA auto: calls markLoadTime after page:finish + paint', { timeout: 20000 }, async () => {
    const { page } = await scPage('/tpc/speedcurve')

    await page.click('#nav-destination')
    await page.waitForSelector('#page')

    // markLoadTime fires after page:finish + two rAFs — give it time
    await waitForLuxCall(page, 'markLoadTime', 8000)
    const calls = await getLuxCalls(page)
    const loadTimeCalls = calls.filter(c => c.method === 'markLoadTime')
    expect(loadTimeCalls.length).toBeGreaterThanOrEqual(1)
  })

  it('SPA auto: timing order is startSoftNavigation before markLoadTime', async () => {
    const { page } = await scPage('/tpc/speedcurve')
    // Wait for the initial page:finish markLoadTime (fired via rAF) to land,
    // then clear so only the next navigation's calls are in the array.
    await waitForLuxCall(page, 'markLoadTime', 3000)
    await page.evaluate(() => {
      (window as any)._luxCalls = []
    })

    await page.click('#nav-destination')
    await page.waitForSelector('#page')
    await waitForLuxCall(page, 'markLoadTime', 8000)

    const calls = await getLuxCalls(page)
    const softNavIdx = calls.findIndex(c => c.method === 'startSoftNavigation')
    const markLoadIdx = calls.findIndex(c => c.method === 'markLoadTime')
    expect(softNavIdx).toBeGreaterThanOrEqual(0)
    expect(markLoadIdx).toBeGreaterThan(softNavIdx)
  })

  it('SPA auto default label: uses Nuxt-generated route name as label', async () => {
    const { page } = await scPage('/tpc/speedcurve')

    await page.click('#nav-destination')
    await page.waitForSelector('#page')

    // Label is set synchronously in router.beforeEach; startSoftNavigation confirms the guard fired.
    await waitForLuxCall(page, 'startSoftNavigation')
    const label = await page.evaluate(() => (window as any).LUX?.label)
    expect(typeof label).toBe('string')
    expect(label).toMatch(/speedcurve.*destination/)
  })

  it('SPA auto: back navigation triggers second startSoftNavigation', {
    timeout: 20000,
  }, async () => {
    const { page } = await scPage('/tpc/speedcurve')

    await page.click('#nav-destination')
    await page.waitForSelector('#page')
    await waitForLuxCall(page, 'markLoadTime', 8000)

    await page.click('#nav-back')
    await page.waitForSelector('#nav-destination')

    await waitForLuxCall(page, 'startSoftNavigation')
    const calls = await getLuxCalls(page)
    const softNavCalls = calls.filter(c => c.method === 'startSoftNavigation')
    expect(softNavCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('canceled navigation: seals phantom beacon with luxNavFailed tag', async () => {
    const { page } = await scPage('/tpc/speedcurve')

    await page.click('#nav-blocked')

    await page.waitForFunction(
      () => ((window as any)._luxCalls as LuxCall[])?.some(c => c.method === 'addData'),
      { timeout: 5000 },
    )

    const calls = await getLuxCalls(page)
    const addDataCall = calls.find(c => c.method === 'addData')
    expect(addDataCall?.args).toEqual(['luxNavFailed', '1'])

    const markLoadCall = calls.find(c => c.method === 'markLoadTime')
    expect(markLoadCall).toBeDefined()

    expect(page.url()).toContain('/tpc/speedcurve')
    expect(page.url()).not.toContain('/blocked')
  })

  it('SPA off: no startSoftNavigation call when spaMode is false', async () => {
    const { page } = await scPage('/tpc/speedcurve-no-spa')

    await page.click('#nav-destination')
    await page.waitForSelector('#page')
    await page.waitForTimeout(1000) // negative assertion: let any hooks fire if they mistakenly exist

    const calls = await getLuxCalls(page)
    const softNavCalls = calls.filter(c => c.method === 'startSoftNavigation')
    expect(softNavCalls).toHaveLength(0)
  })

  it('custom labelFor: applies the user-provided label function', async () => {
    const { page } = await scPage('/tpc/speedcurve-custom-label')

    await page.click('#nav-destination')
    await page.waitForSelector('#page')

    // Label is set in router.beforeEach; waiting for startSoftNavigation confirms the guard fired.
    await waitForLuxCall(page, 'startSoftNavigation')
    const label = await page.evaluate(() => (window as any).LUX?.label)
    expect(label).toBe('custom:/tpc/speedcurve-custom-label/destination')
  })

  it('labelFor false: leaves window.LUX.label unchanged after navigation', async () => {
    const { page } = await scPage('/tpc/speedcurve-label-off')

    await page.click('#nav-destination')
    await page.waitForSelector('#page')

    // startSoftNavigation confirms the router guard ran (and did not set label).
    await waitForLuxCall(page, 'startSoftNavigation')
    const label = await page.evaluate(() => (window as any).LUX?.label)
    expect(label).toBe('original-label')
  })

  it('autoTrackSpaNavigations false: no startSoftNavigation calls on navigation', { timeout: 20000 }, async () => {
    const { page } = await scPage('/tpc/speedcurve-manual')

    await page.click('#nav-destination')
    await page.waitForSelector('#page')
    await page.waitForTimeout(1000) // negative assertion: let any hooks fire if they mistakenly exist

    const calls = await getLuxCalls(page)
    const softNavCalls = calls.filter(c => c.method === 'startSoftNavigation')
    expect(softNavCalls).toHaveLength(0)
  })
}
