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
    const sources = await page.$$eval('script[src]', scripts => scripts.map(script => script.getAttribute('src')))
    expect(sources).toContain('/foo/_scripts/assets/ff1523fb7389539c.js')
  })
})
