import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup, useTestContext } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/issue-882-used'),
  build: true,
  browser: false,
})

/**
 * Minifiers pick the quoting style per string literal (esbuild preserves the
 * source quotes, oxc/rolldown normalizes to template literals), so attribute
 * assertions must accept every quoting form.
 */
function attrValueRe(name: string, value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${name}\\s*:\\s*["'\`]${escaped}["'\`]`)
}

/**
 * Read the emitted client chunks of the running test-utils build. Chunk naming
 * and island import-map reachability differ between a manual `nuxt build`
 * (.output) and @nuxt/test-utils builds (.nuxt/test/<id>/output), and not every
 * dynamically loaded island chunk is reachable by walking module specifiers
 * over HTTP — so read the files Nitro copied into its public dir directly.
 */
async function readClientChunks(): Promise<{ name: string, dir: string, code: string }[]> {
  const ctx = useTestContext()
  const nitroOutputDir = ctx.nuxt
    ? ctx.nuxt.options.nitro.output.dir
    : ctx.options.nuxtConfig?.nitro?.output?.dir
  expect(nitroOutputDir, 'expected the test context to expose the nitro output dir').toBeTruthy()
  const clientChunkDir = join(nitroOutputDir!, 'public', '_nuxt')
  const entries = await readdir(clientChunkDir)
  return Promise.all(
    entries.filter(name => name.endsWith('.js')).map(async name => ({
      name,
      dir: clientChunkDir,
      code: await readFile(join(clientChunkDir, name), 'utf-8'),
    })),
  )
}

describe('used script widget (deferred component path)', () => {
  it('bundles the used widget script and keeps integrity + crossorigin through renderStart', async () => {
    const html = await $fetch('/')
    expect(html).toContain('Nuxt Scripts')

    // The deferred used-component path must resolve the placeholder to the
    // content-addressed public bundle URL rather than the remote src.
    const assetUrl = html.match(/\/_scripts\/assets\/[a-f0-9]{16}\.js/)?.[0]
    expect(assetUrl, 'expected a bundled /_scripts/assets/<hash>.js reference in the served page').toBeTruthy()

    // The integrity hash computed on the served bundle must match the hash the
    // deferred renderStart path baked into the page (the script preload link).
    const assetBody = await $fetch(assetUrl!)
    const expectedIntegrity = `sha384-${createHash('sha384').update(assetBody).digest('base64')}`
    expect(html).toContain(`integrity="${expectedIntegrity}"`)

    // The same src + integrity + crossorigin must survive into the built client
    // chunk that drives the runtime script injection.
    const clientChunks = await readClientChunks()
    expect(clientChunks.length, 'expected built client chunks on disk').toBeGreaterThan(0)
    const widgetChunk = clientChunks.find(chunk => chunk.code.includes(assetUrl!))
    expect(widgetChunk, 'expected a built client chunk referencing the bundled asset').toBeTruthy()
    expect(widgetChunk!.code).toMatch(attrValueRe('integrity', expectedIntegrity))
    expect(widgetChunk!.code).toMatch(attrValueRe('crossorigin', 'anonymous'))

    // The fixture builds with client sourcemaps on. Rewriting the chunk shifts every
    // later offset, so the rewrite must hand the bundler a map rather than let it keep
    // the pre-patch one.
    const map = JSON.parse(await readFile(join(widgetChunk!.dir, `${widgetChunk!.name}.map`), 'utf-8'))
    expect(map.mappings, 'the rewritten chunk must still ship a populated sourcemap').toBeTruthy()

    // Unused auto-registered widgets fall back to their remote src; their unresolved
    // integrity placeholders must not ship into any production chunk either.
    for (const chunk of clientChunks) {
      expect(chunk.code, 'a client chunk still contains a placeholder token').not.toContain('__NUXT_SCRIPT_')
    }
  })
})
