import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

const { resolve } = createResolver(import.meta.url)

describe('cdnURL', async () => {
  await setup({
    rootDir: resolve('../fixtures/cdn'),
    nuxtConfig: {
      nitro: {
        prerender: {
          routes: ['/'],
        },
      },
    },
  })
  it('should use cdnURL for bundled scripts', async () => {
    const html = await $fetch('/')

    // Check that the page loads
    expect(html).toContain('CDN URL Test')

    // Check that script tags use the CDN URL
    const scriptTags = html.match(/<script[^>]*src="([^"]+)"[^>]*>/g) || []
    const bundledScripts = scriptTags.filter(tag => tag.includes('/_scripts/'))

    bundledScripts.forEach((scriptTag) => {
      const srcMatch = scriptTag.match(/src="([^"]+)"/)
      if (srcMatch) {
        expect(srcMatch[1]).toMatch(/^https:\/\/cdn\.example\.com\/_scripts\//)
      }
    })
  })

  // Runtime test would require a real CDN to be set up
  // The static test above verifies the CDN URL is used in the generated HTML
})
