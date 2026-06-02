import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// Set env vars BEFORE setup() so Nitro picks them up when it builds the server.
// This proves the single-build / multi-deploy contract for issue #759:
// the same build produces different rendered src values depending on env.
process.env.NUXT_PUBLIC_SCRIPTS_GLOBALS_TRUSTED_SHOPS_SRC = 'https://widgets.trustedshops.com/from-env.js'
// Empty src disables the global for this instance (multi-tenant single build).
process.env.NUXT_PUBLIC_SCRIPTS_GLOBALS_AWIN_SRC = ''

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

  it('a global with an empty src override is not registered for this instance', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('<div id="awin-registered">no</div>')
  })

  it('the scripts:globals hook rewrites a global src at runtime', async () => {
    const html = await $fetch<string>('/')
    // The hook-mutated src is what actually gets registered/preloaded...
    expect(html).toContain('href="https://scrads.example/from-hook.js"')
    // ...while the un-mutated build-time src is never used for registration.
    expect(html).not.toContain('href="https://scrads.example/baked.js"')
  })
})
