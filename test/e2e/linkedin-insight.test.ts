import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils/e2e'
import { describe } from 'vitest'
import { defineLinkedInInsightSuite } from './_linkedin-insight-suite'

const { resolve } = createResolver(import.meta.url)

describe('linkedinInsight (bundled — script served from /_scripts/assets/)', async () => {
  await setup({
    rootDir: resolve('../fixtures/linkedin-insight'),
    browser: true,
  })
  defineLinkedInInsightSuite({ bundled: true })
})
