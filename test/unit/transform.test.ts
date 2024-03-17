import { describe, expect, it } from 'vitest'
import { parse } from 'acorn-loose'
import { parseURL } from 'ufo'
import type { ScriptInjectOptions } from '../../src/plugins/transform'
import { NuxtScriptTransformer } from '../../src/plugins/transform'

async function transform(code: string | string[], options: ScriptInjectOptions) {
  const plugin = NuxtScriptTransformer.vite(options) as any
  const res = await plugin.transform.call(
    { parse: (code: string) => parse(code, { ecmaVersion: 2022, sourceType: 'module', allowImportExportEverywhere: true, allowAwaitOutsideFunction: true }) },
    Array.isArray(code) ? code.join('\n') : code,
    'file.js',
  )
  return res?.code
}

describe('nuxtScriptTransformer', () => {
  it('string arg', async () => {
    const code = await transform(
    `const instance = useScript('https://static.cloudflareinsights.com/beacon.min.js', {
      assetStrategy: 'bundle',
    })`,
    {
      resolveScript(src) {
        return `/_scripts${parseURL(src).pathname}`
      },
    },
    )
    expect(code).toMatchInlineSnapshot(`
      "const instance = useScript('/_scripts/beacon.min.js', {
            assetStrategy: 'bundle',
          })"
    `)
  })

  it('options arg', async () => {
    const code = await transform(
      `const instance = useScript({ defer: true, src: 'https://static.cloudflareinsights.com/beacon.min.js' }, {
      assetStrategy: 'bundle',
    })`,
      {
        resolveScript(src) {
          return `/_scripts${parseURL(src).pathname}`
        },
      },
    )
    expect(code).toMatchInlineSnapshot(`
      "const instance = useScript({ defer: true, src: '/_scripts/beacon.min.js' }, {
            assetStrategy: 'bundle',
          })"
    `)
  })
})
