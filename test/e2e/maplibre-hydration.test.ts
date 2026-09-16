import { createResolver } from '@nuxt/kit'
import { $fetch, createPage, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

/**
 * A production compile strips template comments. A renderless component whose
 * template holds only a comment then renders nothing on the server, while the
 * client expects a comment node, so hydration reports a mismatch.
 *
 * `@nuxt/test-utils` builds inside the Vitest worker, where `NODE_ENV` is `test`.
 * `@vue/compiler-core` picks its development build there, and its `comments`
 * option defaults to `true`, so the bug cannot appear. Setting `comments: false`
 * applies the production default. The first test proves it took effect.
 */
describe('maplibre hydration in a production build', { timeout: 120000 }, async () => {
  await setup({
    rootDir: resolve('../fixtures/maplibre'),
    browser: true,
    nuxtConfig: {
      vue: { compilerOptions: { comments: false } },
    },
  })

  it('compiles the fixture in production mode', async () => {
    // Guards the guard: a development compile keeps this template comment.
    const html = await $fetch<string>('/controls')
    expect(html).not.toContain('production-build-probe')
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
