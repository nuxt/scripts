import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils/e2e'
import { describe } from 'vitest'
import { defineLinkedInInsightSuite } from './_linkedin-insight-suite'

const { resolve } = createResolver(import.meta.url)

describe('linkedinInsight (unbundled — script served from snap.licdn.com)', async () => {
  await setup({
    rootDir: resolve('../fixtures/linkedin-insight-cdn'),
    browser: true,
  })
  defineLinkedInInsightSuite({ bundled: false })
})
