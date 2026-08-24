import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/issue-882'),
  build: true,
  browser: false,
})

describe('unused script widgets', () => {
  it('builds without downloading their scripts', async () => {
    await expect($fetch('/')).resolves.toContain('Nuxt Scripts')
  })
})
