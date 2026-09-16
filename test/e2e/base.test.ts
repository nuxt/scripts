import { createResolver } from '@nuxt/kit'
import { createPage } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

describe('base', async () => {
  await setupFixture({
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
    // the bundled script is injected on onNuxtReady, which lands after hydration
    await page.waitForSelector('script[src^="/foo/_scripts/assets/"]', { state: 'attached', timeout: 15000 })
    const sources = await page.$$eval('script[src]', scripts => scripts.map(script => script.getAttribute('src')))
    expect(sources).toContain('/foo/_scripts/assets/ff1523fb7389539c.js')
  })
})
