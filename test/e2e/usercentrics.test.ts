import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils/e2e'
import { describe } from 'vitest'
import { defineUsercentricsSuite } from './_usercentrics-suite'

const { resolve } = createResolver(import.meta.url)

describe('usercentrics (CMP v3 loader served from web.cmp.usercentrics.eu)', async () => {
  await setup({
    rootDir: resolve('../fixtures/usercentrics'),
    browser: true,
  })
  defineUsercentricsSuite()
})
