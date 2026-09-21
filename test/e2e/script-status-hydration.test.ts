import { createResolver } from '@nuxt/kit'
import { $fetch, createPage, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'

const { resolve } = createResolver(import.meta.url)

/**
 * A page that renders `{{ status }}` must hydrate without a mismatch for every
 * trigger. Each fixture page loads `/probe.js` with one trigger, renders its
 * status, and records every value a `status` watcher sees.
 */
const pages: { path: string, server: string, sequence: string[] }[] = [
  { path: '/default', server: 'awaitingLoad', sequence: ['awaitingLoad', 'loading', 'loaded'] },
  { path: '/onNuxtReady', server: 'awaitingLoad', sequence: ['awaitingLoad', 'loading', 'loaded'] },
  { path: '/client', server: 'awaitingLoad', sequence: ['awaitingLoad', 'loading', 'loaded'] },
  { path: '/registry-client', server: 'awaitingLoad', sequence: ['awaitingLoad', 'loading', 'loaded'] },
  { path: '/visible', server: 'awaitingLoad', sequence: ['awaitingLoad', 'loading', 'loaded'] },
  { path: '/server', server: 'loading', sequence: ['loading', 'loaded'] },
  { path: '/manual', server: 'awaitingLoad', sequence: ['awaitingLoad'] },
]

describe('script status hydration', { timeout: 120000 }, async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/script-status-hydration'),
    browser: true,
  })

  it.each(pages)('hydrates $path without a mismatch', async ({ path, server, sequence }) => {
    const html = await $fetch<string>(path)
    expect(html).toContain(`<div id="status">${server}</div>`)

    const page = await createPage()
    const messages: string[] = []
    page.on('console', message => messages.push(`${message.type()}: ${message.text()}`))
    page.on('pageerror', error => messages.push(`pageerror: ${error.message}`))
    await page.goto(url(path), { waitUntil: 'hydration' })

    const name = path.slice(1)
    const final = sequence.at(-1)!
    await page.waitForFunction(
      ([name, final]) => (window as any).__statusLog?.[name]?.at(-1) === final,
      [name, final] as const,
      { timeout: 10000 },
    )

    expect(messages.filter(message => /hydrat|mismatch/i.test(message))).toEqual([])
    // A watcher on `status` still sees every transition, in order.
    expect(await page.evaluate(name => (window as any).__statusLog[name], name)).toEqual(sequence)
    expect(await page.textContent('#status')).toBe(final)
    await page.close()
  })
})
