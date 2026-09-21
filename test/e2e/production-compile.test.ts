import { createResolver } from '@nuxt/kit'
import { $fetch, createPage, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

/**
 * Guards `setupFixture()`. Every e2e fixture must compile templates like a
 * production build, or production-only hydration bugs cannot fail a test.
 *
 * If one of these tests fails, the fixture build keeps template comments again.
 * Fix `test/utils/setup-fixture.ts`. Do not change these tests.
 */
describe('e2e fixtures compile like a production build', { timeout: 120000 }, async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/production-compile'),
    browser: true,
  })

  it('strips template comments from the server HTML', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('Production compile probe')
    expect(html).not.toContain('production-compile-probe')
  })

  it('reports the hydration mismatch of a comment-only template', async () => {
    const page = await createPage()
    const messages: string[] = []
    page.on('console', message => messages.push(`${message.type()}: ${message.text()}`))
    await page.goto(url('/'), { waitUntil: 'hydration' })

    // A known bug shape must fail visibly. Without comment stripping, it hydrates cleanly.
    expect(messages.filter(message => /hydrat|mismatch/i.test(message))).not.toEqual([])
    await page.close()
  })
})
