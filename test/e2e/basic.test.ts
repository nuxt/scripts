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
  return { page, logs() { return logs } }
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
})
