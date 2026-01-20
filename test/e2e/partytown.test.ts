import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { getBrowser, url, waitForHydration, setup } from '@nuxt/test-utils/e2e'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/partytown'),
  browser: true,
})

describe('partytown integration', () => {
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
      const scripts = Array.from(document.querySelectorAll('script'))
      return scripts.some(s => s.id === 'partytown' || s.src.includes('partytown'))
    })
    expect(partytownLib).toBe(true)

    // Verify our script executed in the worker (check console log)
    expect(consoleLogs.some(log => log.includes('Partytown script executing in worker'))).toBe(true)
  })
})
