import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils/e2e'
import { describe } from 'vitest'
import { defineAhrefsAnalyticsSuite } from './_ahrefs-analytics-suite'

const { resolve } = createResolver(import.meta.url)

describe('ahrefsAnalytics (bundled — script served from /_scripts/assets/)', async () => {
  await setup({
    rootDir: resolve('../fixtures/ahrefs-analytics'),
    browser: true,
  })
  defineAhrefsAnalyticsSuite({ bundled: true })
})
