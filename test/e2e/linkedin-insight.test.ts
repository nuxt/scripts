import { createResolver } from '@nuxt/kit'
import { describe } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'
import { defineLinkedInInsightSuite } from './_linkedin-insight-suite'

const { resolve } = createResolver(import.meta.url)

describe('linkedinInsight (bundled — script served from /_scripts/assets/)', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/linkedin-insight'),
    browser: true,
  })
  defineLinkedInInsightSuite({ bundled: true })
})
