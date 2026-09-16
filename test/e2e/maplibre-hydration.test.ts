import { createResolver } from '@nuxt/kit'
import { createPage, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

/**
 * A production compile strips template comments. A renderless component whose
 * template holds only a comment then renders nothing on the server, while the
 * client expects a comment node, so hydration reports a mismatch.
 *
 * `setupFixture()` strips template comments like a production build, so this
 * mismatch can appear. `production-compile.test.ts` proves the setting works.
 */
describe('maplibre hydration in a production build', { timeout: 120000 }, async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/maplibre'),
    browser: true,
  })

  it('hydrates every control component without a mismatch', async () => {
    const page = await createPage()
    const messages: string[] = []
    page.on('console', message => messages.push(`${message.type()}: ${message.text()}`))
    page.on('pageerror', error => messages.push(`pageerror: ${error.message}`))
    await page.goto(url('/controls'), { waitUntil: 'hydration' })
    await page.waitForFunction(() => (window as any).__ready === true, undefined, { timeout: 20000 })

    expect(messages.filter(message => /hydrat|mismatch/i.test(message))).toEqual([])

    const controls = await page.evaluate(() => ({
      navigation: document.querySelectorAll('.maplibregl-ctrl-top-right .maplibregl-ctrl-zoom-in').length,
      scale: document.querySelectorAll('.maplibregl-ctrl-bottom-left .maplibregl-ctrl-scale').length,
      geolocate: document.querySelectorAll('.maplibregl-ctrl-top-left .maplibregl-ctrl-geolocate').length,
      fullscreen: document.querySelectorAll('.maplibregl-ctrl-top-left .maplibregl-ctrl-fullscreen').length,
      attribution: document.querySelectorAll('.maplibregl-ctrl-attrib').length,
      attributionCorner: document.querySelectorAll('.maplibregl-ctrl-bottom-left .maplibregl-ctrl-attrib').length,
    }))
    expect(controls).toEqual({ navigation: 1, scale: 1, geolocate: 1, fullscreen: 1, attribution: 1, attributionCorner: 1 })
    await page.close()
  })
})
