import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { createPage, setup } from '@nuxt/test-utils/e2e'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/basic'),
  // dev: true,
  browser: true,
  nuxtConfig: {
    app: {
      baseURL: '/foo',
    },
  },
})

describe('base', () => {
  it('bundle', async () => {
    const page = await createPage('/foo/bundle-use-script')
    await page.waitForTimeout(500)
    // get content of #script-src
    const text = await page.$eval('#script-src', el => el.textContent)
    expect(text).toMatchInlineSnapshot(`"/foo/_scripts/6bEy8slcRmYcRT4E2QbQZ1CMyWw9PpHA7L87BtvSs2U.js"`)
  })
})
