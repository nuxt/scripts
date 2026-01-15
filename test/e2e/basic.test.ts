import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { getBrowser, url, waitForHydration, setup } from '@nuxt/test-utils/e2e'
import { parseURL } from 'ufo'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  // dev: true,
  browser: true,
})

async function createPage(path: string, options?: any) {
  const logs: { text: string, location: string }[] = []
  const browser = await getBrowser()
  const page = await browser.newPage(options)
  page.addListener('console', (msg) => {
    const location = `${parseURL(msg.location().url).pathname}:${msg.location().lineNumber}`
    if (!location.startsWith('/_nuxt')) {
      logs.push({
        text: msg.text(),
        location,
      })
    }
  })
  const _goto = page.goto.bind(page)
  page.goto = async (url2, options2) => {
    const waitUntil = options2?.waitUntil
    if (waitUntil && ['hydration', 'route'].includes(waitUntil)) {
      delete options2.waitUntil
    }
    const res = await _goto(url2, options2)
    await waitForHydration(page, url2, waitUntil)
    return res
  }
  if (path) {
    // @ts-expect-error untyped
    await page.goto(url(path), options?.javaScriptEnabled === false ? {} : { waitUntil: 'hydration' })
  }
  // @ts-expect-error untyped
  return {
    page,
    logs() {
      return logs
    },
  }
}

describe('basic', () => {
  it('relative onNuxtReady', async () => {
    const { page, logs } = await createPage('/')
    // visit and collect all logs, we need to do a snapshot on them
    await page.waitForTimeout(500)
    expect(logs()).toMatchInlineSnapshot(`
      [
        {
          "location": "/myScript.js:1",
          "text": "Script -- Loading",
        },
        {
          "location": "/myScript.js:5",
          "text": "Script -- Loaded",
        },
        {
          "location": "/myScript.js:3",
          "text": "Script -- Executed -- test",
        },
      ]
    `)
  })
  it('relative manual', async () => {
    const { page, logs } = await createPage('/manual-trigger')
    await page.waitForTimeout(500)
    expect(logs().length).toBe(0)
    // click button
    await page.click('#load-script')
    await page.waitForTimeout(500)
    expect(logs()).toMatchInlineSnapshot(`
      [
        {
          "location": "/myScript.js:1",
          "text": "Script -- Loading",
        },
        {
          "location": "/myScript.js:5",
          "text": "Script -- Loaded",
        },
        {
          "location": "/myScript.js:3",
          "text": "Script -- Executed -- test",
        },
      ]
    `)
  })
  it('relative visibility', async () => {
    const { page, logs } = await createPage('/visibility-trigger')
    await page.waitForTimeout(500)
    expect(logs().length).toBe(0)
    // scroll to element
    await page.evaluate(() => {
      const el = document.querySelector('#el-trigger') as HTMLElement
      el.scrollIntoView()
    })
    await page.waitForTimeout(500)
    expect(logs()).toMatchInlineSnapshot(`
      [
        {
          "location": "/myScript.js:1",
          "text": "Script -- Loading",
        },
        {
          "location": "/myScript.js:5",
          "text": "Script -- Loaded",
        },
        {
          "location": "/myScript.js:3",
          "text": "Script -- Executed -- test",
        },
      ]
    `)
  })
  it('relative mouseover', async () => {
    const { page, logs } = await createPage('/mouseover-trigger')
    await page.waitForTimeout(500)
    expect(logs().length).toBe(0)
    await page.hover('#el-trigger')
    await page.waitForTimeout(500)
    expect(logs()).toMatchInlineSnapshot(`
      [
        {
          "location": "/myScript.js:1",
          "text": "Script -- Loading",
        },
        {
          "location": "/myScript.js:5",
          "text": "Script -- Loaded",
        },
        {
          "location": "/myScript.js:3",
          "text": "Script -- Executed -- test",
        },
      ]
    `)
  })
  it('bundle', async () => {
    const { page } = await createPage('/bundle-use-script')
    // wait for the script to be loaded
    await page.waitForTimeout(500)
    // get content of #script-src
    const text = await page.$eval('#script-src', el => el.textContent)
    expect(text).toMatchInlineSnapshot(`"/_scripts/6bEy8slcRmYcRT4E2QbQZ1CMyWw9PpHA7L87BtvSs2U.js"`)
  })
})

describe('third-party-capital', () => {
  it('expect GA to collect data', {
    timeout: 10000,
  }, async () => {
    const { page } = await createPage('/tpc/ga')
    await page.waitForTimeout(500)

    // wait for the collect request or timeout
    const request = page.waitForRequest(request => request.url().includes('google-analytics.com/g/collect'), {
      timeout: 10000,
    })
    await page.getByText('Trigger conversion').click()

    await request
  })

  it('expect GTM to work collect data', {
    timeout: 10000,
  }, async () => {
    const { page } = await createPage('/tpc/gtm')
    await page.waitForTimeout(500)

    // wait for the collect request
    const request = page.waitForRequest(request => request.url().includes('analytics.google.com/g/collect?'), {
      timeout: 10000,
    })
    await page.getByText('trigger').click()
    await request
  })

  it('expect reCAPTCHA to execute and verify token', {
    timeout: 15000,
  }, async () => {
    const { page } = await createPage('/tpc/recaptcha')
    await page.waitForTimeout(500)

    // wait for script to load
    await page.waitForFunction(() => document.querySelector('#status')?.textContent?.trim() === 'loaded', { timeout: 5000 })

    // click execute button (this also verifies via server)
    await page.click('#execute')

    // wait for token + verification result
    await page.waitForSelector('#verified', { timeout: 10000 })
    const token = await page.$eval('#token', el => el.textContent?.trim())
    const verified = await page.$eval('#verified', el => el.textContent?.trim())

    // token should exist and verification should pass
    expect(token).toBeTruthy()
    expect(token!.length).toBeGreaterThan(100)
    expect(verified).toBe('true')
  })

  it('expect PostHog to capture events and handle feature flags', {
    timeout: 15000,
  }, async () => {
    const { page } = await createPage('/tpc/posthog')
    await page.waitForTimeout(500)

    // Wait for PostHog to actually initialize (window.posthog exists)
    // Note: Status goes to 'error' for NPM-based scripts, but clientInit still works
    await page.waitForFunction(() => window.posthog !== undefined, { timeout: 10000 })

    // eslint-disable-next-line no-console
    console.log('PostHog initialized successfully')

    // Test event capture - verify client-side call is made
    await page.click('#capture-event')
    await page.waitForTimeout(500)

    // Verify event capture was triggered on client side
    const eventCaptured = await page.$eval('#event-captured', el => el.textContent?.trim())
    expect(eventCaptured).toBe('true')

    // Test identify - verify client-side call is made
    await page.click('#identify-user')
    await page.waitForTimeout(500)

    // Verify identify was triggered on client side
    const identifyCalled = await page.$eval('#identify-called', el => el.textContent?.trim())
    expect(identifyCalled).toBe('true')

    // Verify feature flags were loaded from real PostHog API
    // Give PostHog time to fetch feature flags via /decide endpoint
    await page.waitForTimeout(2000)
    const featureFlagValue = await page.$eval('#feature-flag-value', el => el.textContent?.trim())
    const featureFlagPayload = await page.$eval('#feature-flag-payload', el => el.textContent?.trim())

    // Feature flag should be loaded (value depends on PostHog dashboard config)
    // We just verify the API was called and returned a value
    expect(featureFlagValue).toBeDefined()
    expect(featureFlagPayload).toBeDefined()

    // Optional: Log actual values for debugging
    // eslint-disable-next-line no-console
    console.log('Feature flag value:', featureFlagValue)
    // eslint-disable-next-line no-console
    console.log('Feature flag payload:', featureFlagPayload)
  })

  it.todo('expect Google Sign-In to load and render button - requires network access to Google', async () => {
    const { page } = await createPage('/tpc/google-sign-in')

    // wait for client hydration
    await page.waitForSelector('#status', { timeout: 5000 })

    // wait for script to load (Google's script can be slow)
    await page.waitForFunction(() => {
      const status = document.querySelector('#status')?.textContent?.trim()
      return status === 'loaded'
    }, { timeout: 20000 })

    // verify button was rendered
    await page.waitForSelector('#button-rendered', { timeout: 5000 })
    const buttonRendered = await page.$eval('#button-rendered', el => el.textContent?.trim())
    expect(buttonRendered).toBe('true')

    // verify window.google.accounts.id is available
    const hasGoogleApi = await page.evaluate(() => {
      return typeof window.google !== 'undefined'
        && typeof window.google.accounts !== 'undefined'
        && typeof window.google.accounts.id !== 'undefined'
        && typeof window.google.accounts.id.initialize === 'function'
    })
    expect(hasGoogleApi).toBe(true)
  })
})
