import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils/e2e'
import { describe } from 'vitest'
import { defineCalendlySuite } from './_calendly-suite'

const { resolve } = createResolver(import.meta.url)

describe('calendly (unbundled — script served from assets.calendly.com)', async () => {
  await setup({
    rootDir: resolve('../fixtures/calendly-cdn'),
    browser: true,
  })
  defineCalendlySuite({ bundled: false })
})
