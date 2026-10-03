import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup, useTestContext } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/issue-882'),
  build: true,
  browser: false,
})

/**
 * Placeholder tokens are inserted at transform time and must be fully resolved before
 * files are written. The deferred removal path used to key on unminified source text,
 * which production minification (e.g. oxc template-literal quoting) never matched.
 */
async function readClientChunks(): Promise<string[]> {
  const ctx = useTestContext()
  const nitroOutputDir = ctx.nuxt
    ? ctx.nuxt.options.nitro.output.dir
    : ctx.options.nuxtConfig?.nitro?.output?.dir
  expect(nitroOutputDir, 'expected the test context to expose the nitro output dir').toBeTruthy()
  const clientChunkDir = join(nitroOutputDir!, 'public', '_nuxt')
  const entries = await readdir(clientChunkDir)
  return Promise.all(
    entries.filter(name => name.endsWith('.js')).map(name => readFile(join(clientChunkDir, name), 'utf-8')),
  )
}

describe('unused script widgets', () => {
  it('builds without downloading their scripts', async () => {
    await expect($fetch('/')).resolves.toContain('Nuxt Scripts')
  })

  it('ships no unresolved bundle placeholders in any client chunk', async () => {
    const chunks = await readClientChunks()
    expect(chunks.length).toBeGreaterThan(0)
    for (const code of chunks) {
      expect(code, 'a client chunk still contains a placeholder token').not.toContain('__NUXT_SCRIPT_')
    }
  })
})
