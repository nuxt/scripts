import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'
import { parseURL } from 'ufo'

const { resolve } = createResolver(import.meta.url)

describe('basic', async () => {
  await setup({
    rootDir: resolve('../fixtures/extend-registry'),
  })
  it('extended registry script loads and executes function', async () => {
    const page = await createPage()
    const logs: { text: string, location: string }[] = []
    // visit and collect all logs, we need to do a snapshot on them
    page.addListener('console', (msg) => {
      logs.push({
        text: msg.text(),
        location: `${parseURL(msg.location().url).pathname}:${msg.location().lineNumber}`,
      })
    })
    await page.goto(url('/'))
    await page.waitForTimeout(5000)
    expect(logs.filter(log => !log.location.startsWith('/_nuxt') && !log.location.startsWith('/:0'))).toMatchInlineSnapshot(`
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
  }, {
    timeout: 30000,
  })
})
