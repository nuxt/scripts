import type { Page } from 'playwright-core'
import { createResolver } from '@nuxt/kit'
import { $fetch, createPage, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)
const unhead35 = process.env.NUXT_SCRIPTS_TEST_UNHEAD === '3.5.0'

/**
 * A page that renders `{{ status }}` must hydrate without a mismatch for every
 * trigger. Each fixture page loads `/probe.js` with one trigger, renders its
 * status, and records every value a `status` watcher sees.
 */
const pages: {
  path: string
  name?: string
  server: string
  final: string
  hydrate?: (page: Page) => Promise<void>
}[] = [
  { path: '/default', server: 'awaitingLoad', final: 'loaded' },
  { path: '/onNuxtReady', server: 'awaitingLoad', final: 'loaded' },
  { path: '/client', server: 'awaitingLoad', final: 'loaded' },
  { path: '/registry-client', server: 'awaitingLoad', final: 'loaded' },
  { path: '/visible', server: 'awaitingLoad', final: 'loaded' },
  {
    path: '/lazy-hydration',
    name: 'lazy-client',
    server: 'awaitingLoad',
    final: 'loaded',
    // Bring the lazily hydrated component into view, which starts its own late hydration.
    hydrate: page => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)),
  },
  { path: '/server', server: 'loading', final: 'loaded' },
  { path: '/manual', server: 'awaitingLoad', final: 'awaitingLoad' },
]

/** The order the status moves in. An unknown status lands before `awaitingLoad`. */
const statuses = ['awaitingLoad', 'loading', 'loaded']

describe('script status hydration', { timeout: 120000 }, async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/script-status-hydration'),
    browser: true,
  })

  it.each(pages)('hydrates $path without a mismatch', async ({ path, name, server, final, hydrate }) => {
    const html = await $fetch<string>(path)
    expect(html).toContain(`<div id="status">${server}</div>`)

    const page = await createPage()
    const messages: string[] = []
    page.on('console', message => messages.push(`${message.type()}: ${message.text()}`))
    page.on('pageerror', error => messages.push(`pageerror: ${error.message}`))
    await page.goto(url(path), { waitUntil: 'hydration' })

    await hydrate?.(page)

    const key = name ?? path.slice(1)
    await page.waitForFunction(
      ([key, final]) => (window as any).__statusLog?.[key]?.at(-1) === final,
      [key, final] as const,
      { timeout: 10000 },
    )

    expect(messages.filter(message => /hydrat|mismatch/i.test(message))).toEqual([])
    // A watcher on `status` sees the server status first and the final status
    // last, with any `loading` in between. Whether `loading` shows up depends
    // on whether the script executes before hydration ends, so only the order
    // is asserted, never an exact sequence.
    const sequence = await page.evaluate(key => (window as any).__statusLog[key], key)
    expect(sequence[0]).toBe(server)
    expect(sequence.at(-1)).toBe(final)
    for (let i = 1; i < sequence.length; i++)
      expect(statuses.indexOf(sequence[i])).toBeGreaterThan(statuses.indexOf(sequence[i - 1]))
    expect(await page.textContent('#status')).toBe(final)
    if (path === '/server' && unhead35)
      expect(await page.evaluate(() => (window as Window & { __probeLoaded?: number }).__probeLoaded)).toBe(1)
    await page.close()
  })

  it.each([
    { trigger: '', inServerHtml: false },
    { trigger: 'client', inServerHtml: false },
    { trigger: 'server', inServerHtml: true },
    { trigger: 'manual', inServerHtml: false },
  ])('loads one beacon with trigger "$trigger"', async ({ trigger, inServerHtml }) => {
    const path = `/cloudflare-analytics?trigger=${trigger}`
    const html = await $fetch<string>(path)
    expect(html.match(/ data-cf-beacon=/g) ?? []).toHaveLength(inServerHtml ? 1 : 0)

    const page = await createPage()
    try {
      await page.goto(url(path), { waitUntil: 'hydration' })
      if (trigger === 'manual') {
        expect(await page.textContent('#status')).toBe('awaitingLoad')
        expect(await page.locator('script[data-cf-beacon]').count()).toBe(0)
        await page.getByRole('button', { name: 'Load beacon' }).click()
      }
      await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'loaded')
      expect(await page.locator('script[data-cf-beacon]').count()).toBe(1)
      expect(await page.evaluate(() => (window as Window & { __probeLoaded?: number }).__probeLoaded)).toBe(1)
    }
    finally {
      await page.close()
    }
  })

  it.each([
    { trigger: 'client', status: 'loaded' },
    { trigger: 'server', status: unhead35 ? 'loading' : 'loaded' },
  ])('tracks $trigger scripts with inline handlers blocked', async ({ trigger, status }) => {
    const target = url(`/${trigger}`)
    const page = await createPage()
    try {
      await page.route(target, async (route) => {
        const response = await route.fetch()
        await route.fulfill({
          response,
          headers: { ...response.headers(), 'content-security-policy': 'script-src-attr \'none\'' },
        })
      })
      // Keep Nuxt's entry pending until the server script has executed.
      if (trigger === 'server') {
        await page.route('**/_nuxt/*.js', async (route) => {
          try {
            await page.waitForFunction(() => (window as Window & { __probeLoaded?: number }).__probeLoaded, undefined, { timeout: 10000 })
          }
          finally {
            await route.continue()
          }
        })
      }
      await page.goto(target, { waitUntil: 'hydration' })

      // Unhead 3.5.0 cannot recover the load event when CSP blocks its inline handler.
      // https://github.com/unjs/unhead/pull/1091
      await expect.poll(() => page.textContent('#status')).toBe(status)
      const executions = await page.evaluate(() => (window as Window & { __probeLoaded?: number }).__probeLoaded)
      if (trigger === 'client' || unhead35)
        expect(executions).toBe(1)
      else
        expect(executions).toBeGreaterThan(0)
    }
    finally {
      await page.close()
    }
  })
})
