import { createResolver } from '@nuxt/kit'
import { $fetch, createPage, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it, onTestFinished } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/unhead-v3'),
  dev: true,
  browser: true,
})

describe('unhead v3', () => {
  it('sSR renders pages that exercise the v3 regression surface', async () => {
    const html = await $fetch<string>('/')
    // App rendered — proves the v3 build/SSR did not error on useScript,
    // useHead, or the partytown quick-path inside the fixture's app.vue.
    expect(html).toContain('id="probe-status"')
    // useHead resource-hint with runtime-determined rel (the original Daniel
    // error from PR #795). If a regression silently drops the tag, this fails.
    expect(html).toMatch(/<link[^>]+rel="(preconnect|dns-prefetch)"[^>]+example\.com/)
  })

  it('keeps a retained script proxy live across load', async () => {
    const page = await createPage('/')
    onTestFinished(() => page.close())
    await page.waitForFunction(() => document.querySelector('#proxy-result')?.textContent === 'passed')

    expect(await page.textContent('#proxy-result')).toBe('passed')
  }, 15_000)

  it('loads and dedupes source-less registry SDKs through Unhead', async () => {
    const page = await createPage('/')
    onTestFinished(() => page.close())
    await page.waitForFunction(() => document.querySelector('#module-result')?.textContent !== 'pending')

    expect({
      identity: await page.textContent('#module-identity'),
      result: await page.textContent('#module-result'),
    }).toEqual({ identity: 'true', result: 'passed' })
    expect(await page.textContent('#module-runtime')).toBe('native')
    expect(await page.textContent('#module-init-count')).toBe('1')
  }, 15_000)
})
