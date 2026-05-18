import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils/e2e'
import { describe } from 'vitest'
import { defineSpeedCurveSuite } from './_speedcurve-suite'

const { resolve } = createResolver(import.meta.url)

describe('speedcurve', { timeout: 15000 }, async () => {
  await setup({
    rootDir: resolve('../fixtures/speedcurve'),
    browser: true,
  })
  defineSpeedCurveSuite()
})
