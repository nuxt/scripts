import { createResolver } from '@nuxt/kit'
import { describe } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'
import { defineAhrefsAnalyticsSuite } from './_ahrefs-analytics-suite'

const { resolve } = createResolver(import.meta.url)

describe('ahrefsAnalytics (bundled — script served from /_scripts/assets/)', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/ahrefs-analytics'),
    browser: true,
  })
  defineAhrefsAnalyticsSuite({ bundled: true })
})
