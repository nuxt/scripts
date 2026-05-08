import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils/e2e'
import { describe } from 'vitest'
import { defineCalendlySuite } from './_calendly-suite'

const { resolve } = createResolver(import.meta.url)

describe('calendly (bundled — script served from /_scripts/assets/)', async () => {
  await setup({
    rootDir: resolve('../fixtures/calendly'),
    browser: true,
  })
  defineCalendlySuite({ bundled: true })
})
