import { createResolver } from '@nuxt/kit'
import { createPage, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

/**
 * A renderless map component must render the same node on the server and the
 * client. A template that holds only a comment, or nothing, renders nothing on
 * the server while the client expects a comment node, so hydration reports a
 * mismatch.
 *
 * `setupFixture()` strips template comments like a production build, so this
 * mismatch can appear. `production-compile.test.ts` proves the setting works.
 */
const pages = ['/maplibre', '/leaflet', '/google-maps']

describe('map component hydration in a production build', { timeout: 120000 }, async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/map-hydration'),
    browser: true,
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
