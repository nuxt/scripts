import { createResolver } from '@nuxt/kit'
import { createPage, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

describe('base', async () => {
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
  it('bundle', async () => {
    const page = await createPage('/foo/bundle-use-script')
    await page.waitForTimeout(500)
    // get content of #script-src
    const text = await page.$eval('#script-src', el => el.textContent)
    expect(text).toMatchInlineSnapshot(`"/foo/_scripts/assets/PHzhM8DFXcXVSSJF110cyV3pjg9cp8oWv_f4Dk2ax1w.js"`)
  })
})
