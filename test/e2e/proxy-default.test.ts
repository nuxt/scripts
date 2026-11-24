import { createResolver } from '@nuxt/kit'
import { $fetch, setup, url } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/proxy-alias'),
  build: true,
  nuxtConfig: {
    scripts: {
      registry: {
        plausibleAnalytics: { domain: 'example.com', proxy: false },
      },
    },
  },
})

it('leaves the collection handler unregistered when no script opts in', async () => {
  expect(await $fetch('/')).toContain('<div id="plausible-endpoint">NO_ENDPOINT</div>')
  // With no proxy handler, the path reaches this fixture's Nuxt app fallback.
  const result = await fetch(url('/_scripts/p/not-configured/api/event'))
  expect(result.status).toBe(200)
  expect(await result.text()).toContain('<div id="plausible-endpoint">NO_ENDPOINT</div>')
})
