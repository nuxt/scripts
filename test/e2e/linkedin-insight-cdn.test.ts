import { createResolver } from '@nuxt/kit'
import { describe } from 'vitest'
import { setupFixture } from '../utils/setup-fixture'
import { defineLinkedInInsightSuite } from './_linkedin-insight-suite'

const { resolve } = createResolver(import.meta.url)

describe('linkedinInsight (unbundled — script served from snap.licdn.com)', async () => {
  await setupFixture({
    rootDir: resolve('../fixtures/linkedin-insight-cdn'),
    browser: true,
  })
  defineLinkedInInsightSuite({ bundled: false })
})
