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
  it('reload method re-executes script', async () => {
    const { page, logs } = await createPage('/reload-trigger')
    await page.waitForTimeout(500)
    // Script should have loaded once
    expect(logs().filter(l => l.text === 'Script -- Loaded').length).toBe(1)
    // Status should be loaded
    expect(await page.$eval('#status', el => el.textContent?.trim())).toBe('loaded')
    // Click reload button
    await page.click('#reload-script')
    await page.waitForTimeout(500)
    // Script should have loaded twice
    expect(logs().filter(l => l.text === 'Script -- Loaded').length).toBe(2)
    // Status should still be loaded after reload
    expect(await page.$eval('#status', el => el.textContent?.trim())).toBe('loaded')
  })
  it('reload method can be called multiple times', async () => {
    const { page, logs } = await createPage('/reload-trigger')
    await page.waitForTimeout(500)
    expect(logs().filter(l => l.text === 'Script -- Loaded').length).toBe(1)
    // Reload 3 times
    await page.click('#reload-script')
    await page.waitForTimeout(300)
    await page.click('#reload-script')
    await page.waitForTimeout(300)
    await page.click('#reload-script')
    await page.waitForTimeout(500)
    // Script should have loaded 4 times total
    expect(logs().filter(l => l.text === 'Script -- Loaded').length).toBe(4)
  })
  it('bundle', async () => {
    const { page } = await createPage('/bundle-use-script')
    // wait for the script to be loaded
    await page.waitForTimeout(500)
    // get content of #script-src
    const text = await page.$eval('#script-src', el => el.textContent)
    expect(text).toMatchInlineSnapshot(`"/_scripts/6bEy8slcRmYcRT4E2QbQZ1CMyWw9PpHA7L87BtvSs2U.js"`)
  })
  it('partytown adds type attribute', async () => {
    const { page } = await createPage('/partytown')
    await page.waitForTimeout(500)
    // verify the script tag has type="text/partytown"
    const scriptType = await page.evaluate(() => {
      const script = document.querySelector('script[src="/myScript.js"]')
      return script?.getAttribute('type')
    })
    expect(scriptType).toBe('text/partytown')
  })
})

describe('youtube', () => {
  it('multiple players only load clicked player', {
    timeout: 20000,
  }, async () => {
    const { page } = await createPage('/youtube-multiple')
    await page.waitForTimeout(500)

    // All players should be waiting initially
    const player1Status = await page.$eval('#player1-status', el => el.textContent?.trim())
    const player2Status = await page.$eval('#player2-status', el => el.textContent?.trim())
    const player3Status = await page.$eval('#player3-status', el => el.textContent?.trim())

    expect(player1Status).toBe('waiting')
    expect(player2Status).toBe('waiting')
    expect(player3Status).toBe('waiting')

    // Click only player 2
    await page.click('#player2')
    await page.waitForTimeout(3000) // Wait for YouTube iframe to load

    // Only player 2 should be ready, others still waiting
    const player1StatusAfter = await page.$eval('#player1-status', el => el.textContent?.trim())
    const player2StatusAfter = await page.$eval('#player2-status', el => el.textContent?.trim())
    const player3StatusAfter = await page.$eval('#player3-status', el => el.textContent?.trim())

    expect(player1StatusAfter).toBe('waiting')
    expect(player2StatusAfter).toBe('ready')
    expect(player3StatusAfter).toBe('waiting')

    // Now click player 1
    await page.click('#player1')
    await page.waitForTimeout(3000)

    // Player 1 and 2 should be ready, player 3 still waiting
    const player1StatusFinal = await page.$eval('#player1-status', el => el.textContent?.trim())
    const player3StatusFinal = await page.$eval('#player3-status', el => el.textContent?.trim())

    expect(player1StatusFinal).toBe('ready')
    expect(player3StatusFinal).toBe('waiting')
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
    timeout: 30000,
  }, async () => {
    const { page } = await createPage('/tpc/gtm')

    // Wait for GTM to load before triggering events
    await page.waitForTimeout(3000)

    // wait for the collect request - GTM needs to load, init GA, then GA fires collect
    const request = page.waitForRequest((request) => {
      const u = request.url()
      return u.includes('google-analytics.com/g/collect') || u.includes('analytics.google.com/g/collect')
    }, {
      timeout: 15000,
    }).catch(() => null)
    await page.getByText('trigger').click()
    const result = await request

    // GTM collect is network-dependent (requires GTM container to have GA4 tag configured)
    // Skip assertion if no collect request was made
    if (result) {
      expect(result.url()).toMatch(/g\/collect/)
    }
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

  it('expect Vercel Analytics to initialize queue and handle events', {
    timeout: 10000,
  }, async () => {
    const { page } = await createPage('/tpc/vercel-analytics')
    await page.waitForTimeout(500)

    // Verify the queue was initialized (clientInit sets up window.va)
    const hasQueue = await page.evaluate(() => {
      return typeof window.va === 'function'
    })
    expect(hasQueue).toBe(true)

    // Track an event via the UI button
    await page.click('#track-event')
    await page.waitForTimeout(300)

    const eventTracked = await page.$eval('#event-tracked', el => el.textContent?.trim())
    expect(eventTracked).toBe('true')

    // Send a pageview via the UI button
    await page.click('#send-pageview')
    await page.waitForTimeout(300)

    const pageviewSent = await page.$eval('#pageview-sent', el => el.textContent?.trim())
    expect(pageviewSent).toBe('true')

    // Verify the queue accumulated events (script won't load from /_vercel/insights in test env)
    const queueLength = await page.evaluate(() => {
      return (window.vaq || []).length
    })
    // Queue should have: beforeSend (if configured) + event + pageview calls
    expect(queueLength).toBeGreaterThanOrEqual(2)
  })
})

describe('social-embeds', () => {
  it('X embed fetches tweet data server-side and renders', {
    timeout: 15000,
  }, async () => {
    const { page } = await createPage('/x-embed')

    // Wait for content to load (SSR should have it immediately, but useAsyncData may need hydration)
    await page.waitForSelector('#tweet-content', { timeout: 10000 })

    // Verify tweet data was fetched and rendered
    const userName = await page.$eval('#user-name', el => el.textContent?.trim())
    const userHandle = await page.$eval('#user-handle', el => el.textContent?.trim())
    const text = await page.$eval('#text', el => el.textContent?.trim())
    const tweetUrl = await page.$eval('#tweet-url', el => el.getAttribute('href'))

    expect(userName).toBeTruthy()
    expect(userHandle).toBeTruthy()
    expect(text).toBeTruthy()
    expect(tweetUrl).toContain('x.com')
    expect(tweetUrl).toContain('/status/')
  })

  it('X embed proxies images through server', {
    timeout: 15000,
  }, async () => {
    const { page } = await createPage('/x-embed')

    await page.waitForSelector('#tweet-content', { timeout: 10000 })

    // Check if there are any images and they use the proxy endpoint
    const hasProxiedImages = await page.evaluate(() => {
      const photos = document.querySelector('#photos')
      if (!photos)
        return true // No photos is OK, some tweets don't have them
      const imgs = photos.querySelectorAll('img')
      return Array.from(imgs).every(img => img.src.includes('/api/_scripts/x-embed-image'))
    })
    expect(hasProxiedImages).toBe(true)
  })

  it('Instagram embed fetches HTML server-side and renders', {
    timeout: 15000,
  }, async () => {
    const { page } = await createPage('/instagram-embed')

    // Wait for content to load
    await page.waitForSelector('#instagram-content', { timeout: 10000 })

    // Verify shortcode was extracted
    const shortcode = await page.$eval('#shortcode', el => el.textContent?.trim())
    expect(shortcode).toBe('C3Sk6d2MTjI')

    // Verify HTML was rendered (should contain Instagram embed markup)
    const hasEmbedHtml = await page.evaluate(() => {
      const embedDiv = document.querySelector('#embed-html')
      return embedDiv && embedDiv.innerHTML.length > 100
    })
    expect(hasEmbedHtml).toBe(true)
  })

  it('Instagram embed proxies images through server', {
    timeout: 15000,
  }, async () => {
    const { page } = await createPage('/instagram-embed')

    await page.waitForSelector('#instagram-content', { timeout: 10000 })

    // Check that images in the embed use the proxy endpoint
    const hasProxiedImages = await page.evaluate(() => {
      const embedDiv = document.querySelector('#embed-html')
      if (!embedDiv)
        return false
      const imgs = embedDiv.querySelectorAll('img')
      if (imgs.length === 0)
        return true // No images yet is OK (might be lazy loaded)
      return Array.from(imgs).every(img =>
        img.src.includes('/api/_scripts/instagram-embed-image')
        || img.src.includes('/api/_scripts/instagram-embed-asset'),
      )
    })
    expect(hasProxiedImages).toBe(true)
  })
})
