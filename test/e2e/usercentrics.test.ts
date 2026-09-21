import { createResolver } from '@nuxt/kit'
import { describe } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'
import { defineUsercentricsSuite } from './_usercentrics-suite'

const { resolve } = createResolver(import.meta.url)

describe('usercentrics (CMP v3 loader served from web.cmp.usercentrics.eu)', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/usercentrics'),
    browser: true,
  })
  defineUsercentricsSuite()
})
