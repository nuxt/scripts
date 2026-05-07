import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils/e2e'
import { describe } from 'vitest'
import { defineAhrefsAnalyticsSuite } from './_ahrefs-analytics-suite'

const { resolve } = createResolver(import.meta.url)

describe('ahrefsAnalytics (unbundled — script served from analytics.ahrefs.com)', async () => {
  await setup({
    rootDir: resolve('../fixtures/ahrefs-analytics-cdn'),
    browser: true,
  })
  defineAhrefsAnalyticsSuite({ bundled: false })
})
