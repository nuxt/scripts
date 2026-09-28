import { createResolver } from '@nuxt/kit'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

describe('google maps renderless components', { timeout: 120000 }, async () => {
  await setup({
    rootDir: resolve('../fixtures/map-hydration'),
    browser: true,
    nuxtConfig: {
      vue: { compilerOptions: { comments: false } },
    },
  })

  it('hydrates without a mismatch', async () => {
    const page = await createPage()
    const messages: string[] = []
    page.on('console', message => messages.push(message.text()))
    page.on('pageerror', error => messages.push(error.message))
    await page.goto(url('/google-maps'), { waitUntil: 'hydration' })
    expect(messages.filter(message => /hydrat|mismatch/i.test(message))).toEqual([])
    await page.close()
  })
})
