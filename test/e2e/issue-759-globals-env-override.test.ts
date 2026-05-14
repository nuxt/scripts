import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// Set env vars BEFORE setup() so Nitro picks them up when it builds the server.
// This proves the single-build / multi-deploy contract for issue #759:
// the same build produces different rendered src values depending on env.
process.env.NUXT_PUBLIC_SCRIPTS_GLOBALS_TRUSTED_SHOPS_SRC = 'https://widgets.trustedshops.com/from-env.js'

await setup({
  rootDir: resolve('../fixtures/issue-759'),
  dev: true,
  browser: false,
})

describe('issue-759 globals env override', () => {
  it('runtimeConfig.public.scriptsGlobals picks up the env-var override', async () => {
    const html = await $fetch<string>('/')
    // The fixture serializes rc.public.scriptsGlobals into #globals-runtime.
    expect(html).toContain('https://widgets.trustedshops.com/from-env.js')
    expect(html).not.toContain('build-default.js')
  })
})
