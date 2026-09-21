import { createResolver } from '@nuxt/kit'
import { describe } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'
import { defineSpeedCurveSuite } from './_speedcurve-suite'

const { resolve } = createResolver(import.meta.url)

describe('speedcurve', { timeout: 15000 }, async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/speedcurve'),
    browser: true,
  })
  defineSpeedCurveSuite()
})
