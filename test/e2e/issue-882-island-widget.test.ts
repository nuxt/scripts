import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createResolver } from '@nuxt/kit'
import { setup, useTestContext } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/issue-882-island'),
  build: true,
  browser: false,
})

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

describe('widget used only inside a client island', () => {
  it('bundles its script when alwaysBundle names the component', async () => {
    const chunks = await readClientChunks()
    expect(chunks.length, 'expected built client chunks on disk').toBeGreaterThan(0)

    // Reachability reads the client module graph, where a `nuxt-client` island component
    // has no importer. Without `alwaysBundle` this build emits no bundled asset at all
    // and the widget loads from calendly.com.
    const widgetChunk = chunks.find(code => code.includes('initInlineWidget'))
    expect(widgetChunk, 'expected a client chunk carrying the inline widget').toBeTruthy()

    // Assert on the component's own call site. The registry composable keeps its default
    // `scriptInput.src` pointing at calendly.com, and the component overrides it, so the
    // remote host still appears elsewhere in the chunk.
    expect(widgetChunk!, 'the island widget must load from the bundled asset').toMatch(
      /src:\s*["'`]\/_scripts\/assets\/[a-f0-9]{16}\.js["'`]\s*,\s*integrity\s*:/,
    )

    for (const code of chunks) {
      expect(code, 'a client chunk still contains a placeholder token').not.toContain('__NUXT_SCRIPT_')
    }
  })
})
