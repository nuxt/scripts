import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/proxy-alias'),
  dev: true,
})

it('serves requests after loading the default cache driver in development', async () => {
  expect(await $fetch('/api/nitro-runtime')).toEqual({ app: true, cached: 'ok', config: true })
})
