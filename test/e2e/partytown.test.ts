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
    const scriptType = await page.evaluate(() => {
      const script = document.querySelector('script[src="/worker-script.js"]')
      return script?.getAttribute('type')
    })
    expect(scriptType).toBe('text/partytown')
  })

  it('partytown config is initialized with forward array', async () => {
    const browser = await getBrowser()
    const page = await browser.newPage()

    await page.goto(url('/'), { waitUntil: 'networkidle' })
    await waitForHydration(page, '/')

    // Verify partytown module sets up config with our forwarded function
    const partytownConfig = await page.evaluate(() => {
      return (window as any).partytown
    })
    expect(partytownConfig).toBeDefined()
    expect(partytownConfig.forward).toContain('testFn')
  })
})
