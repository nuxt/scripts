import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { createPage, setup } from '@nuxt/test-utils/e2e'
import { parseURL } from 'ufo'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  // dev: true,
  browser: true,
})

describe('basic', () => {
  it('relative onNuxtReady', async () => {
    const page = await createPage('/')
    const logs: { text: string, location: string }[] = []
    // visit and collect all logs, we need to do a snapshot on them
    page.addListener('console', (msg) => {
      const location = `${parseURL(msg.location().url).pathname}:${msg.location().lineNumber}`
      if (!location.startsWith('/_nuxt')) {
        logs.push({
          text: msg.text(),
          location,
        })
      }
    })
    await page.waitForTimeout(500)
    expect(logs).toMatchInlineSnapshot(`
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
    const page = await createPage('/manual-trigger')
    const logs: { text: string, location: string }[] = []
    // visit and collect all logs, we need to do a snapshot on them
    page.addListener('console', (msg) => {
      logs.push({
        text: msg.text(),
        location: `${parseURL(msg.location().url).pathname}:${msg.location().lineNumber}`,
      })
    })
    await page.waitForTimeout(500)
    expect(logs.length).toBe(0)
    // click button
    await page.click('#load-script')
    await page.waitForTimeout(500)
    expect(logs).toMatchInlineSnapshot(`
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
    const page = await createPage('/visibility-trigger')
    const logs: { text: string, location: string }[] = []
    // visit and collect all logs, we need to do a snapshot on them
    page.addListener('console', (msg) => {
      logs.push({
        text: msg.text(),
        location: `${parseURL(msg.location().url).pathname}:${msg.location().lineNumber}`,
      })
    })
    await page.waitForTimeout(500)
    expect(logs.length).toBe(0)
    // scroll to element
    await page.evaluate(() => {
      const el = document.querySelector('#el-trigger') as HTMLElement
      el.scrollIntoView()
    })
    await page.waitForTimeout(500)
    expect(logs).toMatchInlineSnapshot(`
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
    const page = await createPage('/mouseover-trigger')
    const logs: { text: string, location: string }[] = []
    // visit and collect all logs, we need to do a snapshot on them
    page.addListener('console', (msg) => {
      logs.push({
        text: msg.text(),
        location: `${parseURL(msg.location().url).pathname}:${msg.location().lineNumber}`,
      })
    })
    await page.waitForTimeout(500)
    expect(logs.length).toBe(0)
    await page.hover('#el-trigger')
    await page.waitForTimeout(500)
    expect(logs).toMatchInlineSnapshot(`
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
    const page = await createPage('/bundle-use-script')
    await page.waitForTimeout(500)
    // get content of #script-src
    const text = await page.$eval('#script-src', el => el.textContent)
    expect(text).toMatchInlineSnapshot(`"/_scripts/6nd5bD9YCW.js"`)
  })
})
