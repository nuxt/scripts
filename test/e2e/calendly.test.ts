import { createResolver } from '@nuxt/kit'
import { describe } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'
import { defineCalendlySuite } from './_calendly-suite'

const { resolve } = createResolver(import.meta.url)

describe('calendly (bundled — script served from /_scripts/assets/)', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/calendly'),
    browser: true,
  })
  defineCalendlySuite({ bundled: true })
})
