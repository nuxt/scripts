import fsp from 'node:fs/promises'
import { createUnplugin } from 'unplugin'
import MagicString from 'magic-string'
import type { SourceMapInput } from 'rollup'
import type { Node } from 'estree-walker'
import { asyncWalk } from 'estree-walker'
import type { Literal, ObjectExpression, Property, SimpleCallExpression } from 'estree'
import type { InferInput } from 'valibot'
import { hasProtocol, parseURL, joinURL } from 'ufo'
import { hash as ohash } from 'ohash'
import { join } from 'pathe'
import { colors } from 'consola/utils'
import { tryUseNuxt, useNuxt } from '@nuxt/kit'
import { logger } from '../logger'
import { bundleStorage } from '../assets'
import { isJS, isVue } from './util'
import type { RegistryScript } from '#nuxt-scripts/types'

export interface AssetBundlerTransformerOptions {
  moduleDetected?: (module: string) => void
  defaultBundle?: boolean
  assetsBaseURL?: string
  scripts?: Required<RegistryScript>[]
  fallbackOnSrcOnBundleFail?: boolean
  renderedScript?: Map<string, {
    content: Buffer
    /**
     * in kb
     */
    size: number
    encoding?: string
    src: string
    filename?: string
  } | Error>
}

function normalizeScriptData(src: string, assetsBaseURL: string = '/_scripts'): { url: string, filename?: string } {
  if (hasProtocol(src, { acceptRelative: true })) {
    src = src.replace(/^\/\//, 'https://')
    const url = parseURL(src)
    const file = [
      `${ohash(url)}.js`, // force an extension
    ].filter(Boolean).join('-')
    const nuxt = tryUseNuxt()
    return { url: joinURL(joinURL(nuxt?.options.app.baseURL || '', assetsBaseURL), file), filename: file }
  }
  return { url: src }
}
async function downloadScript(opts: {
  src: string
  url: string
  filename?: string
}, renderedScript: NonNullable<AssetBundlerTransformerOptions['renderedScript']>) {
  const { src, url, filename } = opts
  if (src === url || !filename) {
    return
  }
  const storage = bundleStorage()
  const scriptContent = renderedScript.get(src)
  let res: Buffer | undefined = scriptContent instanceof Error ? undefined : scriptContent?.content
  if (!res) {
    // Use storage to cache the font data between builds
    if (await storage.hasItem(`bundle:${filename}`)) {
      const res = await storage.getItemRaw<Buffer>(`bundle:${filename}`)
      renderedScript.set(url, {
        content: res!,
        size: res!.length / 1024,
        encoding: 'utf-8',
        src,
        filename,
      })

      return
    }
    let encoding
    let size = 0
    res = await fetch(src).then((r) => {
      if (!r.ok) {
        throw new Error(`Failed to fetch ${src}`)
      }
      encoding = r.headers.get('content-encoding')
      const contentLength = r.headers.get('content-length')
      size = contentLength ? Number(contentLength) / 1024 : 0
      return r.arrayBuffer()
    }).then(r => Buffer.from(r))

    await storage.setItemRaw(`bundle:${filename}`, res)
    size = size || res!.length / 1024
    logger.info(`Downloading script ${colors.gray(`${src} → ${filename} (${size.toFixed(2)} kB ${encoding})`)}`)
    renderedScript.set(url, {
      content: res!,
      size,
      encoding,
      src,
      filename,
    })
  }
}

export function NuxtScriptBundleTransformer(options: AssetBundlerTransformerOptions = {
  renderedScript: new Map(),
}) {
  const nuxt = useNuxt()
  const { renderedScript = new Map() } = options
  const cacheDir = join(nuxt.options.buildDir, 'cache', 'scripts')

  // done after all transformation is done
  // copy all scripts to build
  nuxt.hooks.hook('build:done', async () => {
    const scripts = [...renderedScript]
    if (!scripts.length) {
      logger.debug('[bundle-script-transformer] No scripts to bundle...')
      return
    }
    logger.debug('[bundle-script-transformer] Bundling scripts...')
    // less aggressive cache clearing in dev
    if (!nuxt.options.dev) {
      await fsp.rm(cacheDir, { recursive: true, force: true })
    }
    // ensure dir
    await fsp.mkdir(cacheDir, { recursive: true })
    await Promise.all(scripts.map(async ([url, content]) => {
      if (content instanceof Error || !content.filename)
        return
      await fsp.writeFile(join(nuxt.options.buildDir, 'cache', 'scripts', content.filename), content.content)
      logger.debug(colors.gray(`  ├─ ${url} → ${joinURL(content.src)} (${content.size.toFixed(2)} kB ${content.encoding})`))
    }))
  })

  return createUnplugin(() => {
    return {
      name: 'nuxt:scripts:bundler-transformer',

      transformInclude(id) {
        return isVue(id, { type: ['template', 'script'] }) || isJS(id)
      },

      async transform(code, id) {
        if (!code.includes('useScript')) // all integrations should start with useScriptX
          return

        const ast = this.parse(code)
        const s = new MagicString(code)
        await asyncWalk(ast as Node, {
          async enter(_node) {
            // @ts-expect-error untyped
            const calleeName = (_node as SimpleCallExpression).callee?.name
            if (!calleeName)
              return
            // check it starts with useScriptX where X must be a A-Z alphabetical letter
            const isValidCallee = calleeName === 'useScript' || (calleeName?.startsWith('useScript') && /^[A-Z]$/.test(calleeName?.charAt(9)) && !calleeName.startsWith('useScriptTrigger') && !calleeName.startsWith('useScriptEvent'))
            if (
              _node.type === 'CallExpression'
              && _node.callee.type === 'Identifier'
              && isValidCallee) {
              // we're either dealing with useScript or an integration such as useScriptHotjar, we need to handle
              // both cases
              const fnName = _node.callee?.name
              const node = _node as SimpleCallExpression
              let scriptSrcNode: Literal & { start: number, end: number } | undefined
              let src: false | string | undefined
              if (fnName === 'useScript') {
                // do easy case first where first argument is a literal
                if (node.arguments[0].type === 'Literal') {
                  scriptSrcNode = node.arguments[0] as Literal & { start: number, end: number }
                }
                else if (node.arguments[0].type === 'ObjectExpression') {
                  const srcProperty = node.arguments[0].properties.find(
                    (p: any) => (p.key?.name === 'src' || p.key?.value === 'src') && p?.value.type === 'Literal',
                  )
                  scriptSrcNode = (srcProperty as Property | undefined)?.value as Literal & { start: number, end: number }
                }
              }
              else {
                // find the registry node
                const registryNode = options.scripts?.find(i => i.import.name === fnName)
                if (!registryNode) {
                  // silent failure
                  return
                }
                // this is only needed when we have a dynamic src that we need to compute
                if (!registryNode.scriptBundling && !registryNode.src)
                  return

                // integration case
                // extract the options as the first argument that we'll use to reconstruct the src
                if (node.arguments[0]?.type === 'ObjectExpression') {
                  const optionsNode = node.arguments[0] as ObjectExpression
                  const fnArg0 = {}
                  // extract literal values from the object to reconstruct the options
                  for (const prop of optionsNode.properties) {
                    if (prop.type === 'Property' && prop.value.type === 'Literal')
                      // @ts-expect-error untyped
                      fnArg0[prop.key.name] = prop.value.value
                  }
                  const srcProperty = node.arguments[0].properties.find(
                    (p: any) => (p.key?.name === 'src' || p.key?.value === 'src') && p?.value.type === 'Literal' && p.type === 'Property',
                  ) as Property | undefined
                  if ((srcProperty?.value as Literal)?.value) {
                    scriptSrcNode = srcProperty?.value as Literal & { start: number, end: number }
                  }
                  else {
                    src = registryNode.scriptBundling && registryNode.scriptBundling(fnArg0 as any as InferInput<any>)
                    // not supported
                    if (src === false)
                      return
                  }
                }
              }

              if (scriptSrcNode || src) {
                src = src || (typeof scriptSrcNode?.value === 'string' ? scriptSrcNode?.value : false)
                if (src) {
                  let canBundle = !!options.defaultBundle
                  // useScript
                  if (node.arguments[1]?.type === 'ObjectExpression') {
                    const scriptOptionsArg = node.arguments[1] as ObjectExpression & { start: number, end: number }
                    // second node needs to be an object with an property of assetStrategy and a value of 'bundle'
                    const bundleProperty = scriptOptionsArg.properties.find(
                      (p: any) => (p.key?.name === 'bundle' || p.key?.value === 'bundle') && p.type === 'Property',
                    ) as Property & { start: number, end: number } | undefined
                    if (bundleProperty && bundleProperty.value.type === 'Literal') {
                      const value = bundleProperty.value as Literal
                      if (String(value.value) !== 'true') {
                        canBundle = false
                        return
                      }
                      // if bundle was the only argument then strip the argument
                      if (scriptOptionsArg.properties.length === 1) {
                        s.remove(scriptOptionsArg.start, scriptOptionsArg.end)
                      }
                      else {
                        const nextProperty = scriptOptionsArg.properties.find(
                          (p: any) => p.start > bundleProperty.end && p.type === 'Property',
                        ) as undefined | (Property & { start: number, end: number })
                        s.remove(bundleProperty.start, nextProperty ? nextProperty.start : bundleProperty.end)
                      }
                      canBundle = true
                    }
                  }
                  // @ts-expect-error untyped
                  const scriptOptions = node.arguments[0].properties?.find(
                    (p: any) => (p.key?.name === 'scriptOptions'),
                  ) as Property | undefined
                  // we need to check if scriptOptions contains bundle: true, if it exists
                  // @ts-expect-error untyped
                  const bundleOption = scriptOptions?.value.properties?.find((prop) => {
                    return prop.type === 'Property' && prop.key?.name === 'bundle' && prop.value.type === 'Literal'
                  })
                  canBundle = bundleOption ? bundleOption.value.value : canBundle
                  if (canBundle) {
                    const { url: _url, filename } = normalizeScriptData(src, options.assetsBaseURL)
                    let url = _url
                    try {
                      await downloadScript({ src, url, filename }, renderedScript)
                    }
                    catch (e) {
                      if (options.fallbackOnSrcOnBundleFail) {
                        logger.warn(`[Nuxt Scripts: Bundle Transformer] Failed to bundle ${src}. Fallback to remote loading.`)
                        url = src
                      }
                      else {
                        throw e
                      }
                    }

                    if (src === url) {
                      if (src && src.startsWith('/'))
                        console.warn(`[Nuxt Scripts: Bundle Transformer] Relative scripts are already bundled. Skipping bundling for \`${src}\`.`)
                      else
                        console.warn(`[Nuxt Scripts: Bundle Transformer] Failed to bundle ${src}.`)
                    }
                    if (scriptSrcNode) {
                      s.overwrite(scriptSrcNode.start, scriptSrcNode.end, `'${url}'`)
                    }
                    else {
                      const optionsNode = node.arguments[0] as ObjectExpression
                      // check if there's a scriptInput property
                      const scriptInputProperty = optionsNode.properties.find(
                        (p: any) => p.key?.name === 'scriptInput' || p.key?.value === 'scriptInput',
                      )
                      // see if there is a script input on it
                      if (scriptInputProperty) {
                        // @ts-expect-error untyped
                        const scriptInput = scriptInputProperty.value
                        if (scriptInput.type === 'ObjectExpression') {
                          const srcProperty = scriptInput.properties.find(
                            (p: any) => p.key?.name === 'src' || p.key?.value === 'src',
                          )
                          if (srcProperty)
                            s.overwrite(srcProperty.value.start, srcProperty.value.end, `'${url}'`)
                          else
                            s.appendRight(scriptInput.end, `, src: '${url}'`)
                        }
                      }
                      else {
                        // @ts-expect-error untyped
                        s.appendRight(node.arguments[0].start + 1, ` scriptInput: { src: '${url}' }, `)
                      }
                    }
                  }
                }
              }
            }
          },
        })

        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
          }
        }
      },
    }
  })
}
