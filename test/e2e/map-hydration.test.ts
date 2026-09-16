import { createResolver } from '@nuxt/kit'
import { $fetch, createPage, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

/**
 * A renderless map component must render the same node on the server and the
 * client. A template that holds only a comment, or nothing, renders nothing on
 * the server while the client expects a comment node, so hydration reports a
 * mismatch.
 *
 * `@nuxt/test-utils` builds inside the Vitest worker, where `NODE_ENV` is `test`.
 * `@vue/compiler-core` picks its development build there, and its `comments`
 * option defaults to `true`, so a comment-only template cannot fail. Setting
 * `comments: false` applies the production default. The probe test proves it.
 */
const pages = ['/maplibre', '/leaflet', '/google-maps']

describe('map component hydration in a production build', { timeout: 120000 }, async () => {
  await setup({
    rootDir: resolve('../fixtures/map-hydration'),
    browser: true,
    nuxtConfig: {
      vue: { compilerOptions: { comments: false } },
    },
  })

  it.each(pages)('strips template comments from %s, like a production build', async (path) => {
    const html = await $fetch<string>(path)
    expect(html).toContain('<div id="__nuxt">')
    expect(html).not.toContain('production-build-probe')
  })

  it.each(pages)('hydrates %s without a mismatch', async (path) => {
    const page = await createPage()
    const messages: string[] = []
    page.on('console', message => messages.push(`${message.type()}: ${message.text()}`))
    page.on('pageerror', error => messages.push(`pageerror: ${error.message}`))
    await page.goto(url(path), { waitUntil: 'hydration' })

    expect(messages.filter(message => /hydrat|mismatch/i.test(message))).toEqual([])
    await page.close()
  })
})
