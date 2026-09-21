import { createResolver } from '@nuxt/kit'
import { describe } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'
import { defineAhrefsAnalyticsSuite } from './_ahrefs-analytics-suite'

const { resolve } = createResolver(import.meta.url)

describe('ahrefsAnalytics (unbundled — script served from analytics.ahrefs.com)', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/ahrefs-analytics-cdn'),
    browser: true,
  })
  defineAhrefsAnalyticsSuite({ bundled: false })
})
