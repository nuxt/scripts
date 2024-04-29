import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { createPage, setup } from '@nuxt/test-utils/e2e'
import { parseURL } from 'ufo'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  dev: true,
  browser: true,
})

describe('basic', () => {
  it('relative script loads and executes function', async () => {
    const page = await createPage('/')
    const logs: { text: string, location: string }[] = []
    // visit and collect all logs, we need to do a snapshot on them
    page.addListener('console', (msg) => {
      logs.push({
        text: msg.text(),
        location: `${parseURL(msg.location().url).pathname}:${msg.location().lineNumber}`,
      })
    })
    await page.waitForTimeout(1000)
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
})
