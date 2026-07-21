import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

// Skip when the workspace root already resolves @unhead/vue to v3 (e.g. an
// ecosystem-ci v3 run): the rest of the suite then provides v3 coverage and
// this fixture is redundant. The fixture exists to backstop v3 specifically
// while the default install resolves to v2.
function rootUnheadMajor(): number | null {
  try {
    const pkgPath = fileURLToPath(new URL('../../node_modules/@unhead/vue/package.json', import.meta.url))
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return Number.parseInt(String(pkg.version).split('.')[0], 10)
  }
  catch {
    return null
  }
}
const skip = rootUnheadMajor() === 3

if (!skip) {
  await setup({
    rootDir: resolve('../fixtures/unhead-v3'),
    dev: true,
    browser: false,
  })
}

describe.skipIf(skip)('unhead v3 compat', () => {
  it('sSR renders pages that exercise the v3 regression surface', async () => {
    const html = await $fetch<string>('/')
    // App rendered — proves the v3 build/SSR did not error on useScript,
    // useHead, or the partytown quick-path inside the fixture's app.vue.
    expect(html).toContain('id="probe-status"')
    // useHead resource-hint with runtime-determined rel (the original Daniel
    // error from PR #795). If a regression silently drops the tag, this fails.
    expect(html).toMatch(/<link[^>]+rel="(preconnect|dns-prefetch)"[^>]+example\.com/)
  })
})
