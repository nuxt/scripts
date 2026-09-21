import { createResolver } from '@nuxt/kit'
import { describe } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'
import { defineCalendlySuite } from './_calendly-suite'

const { resolve } = createResolver(import.meta.url)

describe('calendly (unbundled — script served from assets.calendly.com)', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/calendly-cdn'),
    browser: true,
  })
  defineCalendlySuite({ bundled: false })
})
