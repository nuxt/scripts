import { createHash } from 'node:crypto'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../fixtures/issue-882-used'),
  build: true,
  browser: false,
})

const ABS_CHUNK_RE = /\/_nuxt\/[\w-]+\.js/g
const REL_CHUNK_RE = /\.\/([\w-]+\.js)/g

/**
 * Walk the built client module graph over HTTP, starting from the entry chunk
 * referenced by the served page's import map, until we find the chunk that
 * carries the rewritten `useScript*` call for the bundled widget. Chunks are
 * connected by both absolute (`/_nuxt/x.js`) and relative (`./x.js`) specifiers.
 */
async function findWidgetChunk(entryUrl: string, marker: string): Promise<string[]> {
  const queue = [entryUrl]
  const visited = new Set<string>()
  const hits: string[] = []
  let guard = 0
  while (queue.length && guard < 200) {
    guard++
    const url = queue.shift()!
    if (visited.has(url))
      continue
    visited.add(url)
    const code = await $fetch(url)
    const refs = new Set<string>()
    for (const ref of code.match(ABS_CHUNK_RE) || [])
      refs.add(ref)
    for (const ref of code.match(REL_CHUNK_RE) || [])
      refs.add(`/_nuxt/${ref.slice(2)}`)
    for (const ref of refs) {
      if (!visited.has(ref))
        queue.push(ref)
    }
    if (code.includes(marker))
      hits.push(code)
  }
  return hits
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
    const entry = html.match(/"#entry":"(\/_nuxt\/[\w-]+\.js)"/)?.[1]
    expect(entry, 'expected an entry chunk in the served page import map').toBeTruthy()
    const widgetChunks = await findWidgetChunk(entry!, assetUrl!)
    expect(widgetChunks.length, 'expected a built client chunk referencing the bundled asset').toBeGreaterThan(0)
    const rewritten = widgetChunks.join('\n')
    expect(rewritten).toContain(`integrity:\`${expectedIntegrity}\``)
    expect(rewritten).toContain(`crossorigin:\`anonymous\``)
  })
})
