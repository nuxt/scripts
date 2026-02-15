import { createHash } from 'node:crypto'
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
import type { FetchOptions } from 'ofetch'
import { $fetch } from 'ofetch'
import { logger } from '../logger'
import { bundleStorage } from '../assets'
import { getProxyConfig, rewriteScriptUrls, type ProxyRewrite } from '../proxy-configs'
import { isJS, isVue } from './util'
import type { RegistryScript } from '#nuxt-scripts/types'

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000

export type IntegrityAlgorithm = 'sha256' | 'sha384' | 'sha512'

function calculateIntegrity(content: Buffer, algorithm: IntegrityAlgorithm = 'sha384'): string {
  const hash = createHash(algorithm).update(content).digest('base64')
  return `${algorithm}-${hash}`
}

export async function isCacheExpired(storage: any, filename: string, cacheMaxAge: number = SEVEN_DAYS_IN_MS): Promise<boolean> {
  const metaKey = `bundle-meta:${filename}`
  const meta = await storage.getItem(metaKey)
  if (!meta || !meta.timestamp) {
    return true // No metadata means expired/invalid cache
  }
  return Date.now() - meta.timestamp > cacheMaxAge
}

export interface RenderedScriptMeta {
  content: Buffer
  /**
   * in kb
   */
  size: number
  encoding?: string
  src: string
  filename?: string
  integrity?: string
}

export interface AssetBundlerTransformerOptions {
  moduleDetected?: (module: string) => void
  defaultBundle?: boolean | 'force'
  assetsBaseURL?: string
  scripts?: Required<RegistryScript>[]
  /**
   * Merged configuration from both scripts.registry and runtimeConfig.public.scripts
   * Used to provide default options to script bundling functions when no arguments are provided
   */
  registryConfig?: Record<string, any>
  /**
   * Whether first-party mode is enabled
   */
  firstPartyEnabled?: boolean
  /**
   * Path prefix for collection proxy endpoints
   */
  firstPartyCollectPrefix?: string
  fallbackOnSrcOnBundleFail?: boolean
  fetchOptions?: FetchOptions
  cacheMaxAge?: number
  /**
   * Enable automatic integrity hash generation for bundled scripts.
   * When enabled, calculates SRI hash and injects integrity attribute.
   * @default false
   */
  integrity?: boolean | IntegrityAlgorithm
  renderedScript?: Map<string, RenderedScriptMeta | Error>
}

function normalizeScriptData(src: string, assetsBaseURL: string = '/_scripts'): { url: string, filename?: string } {
  if (hasProtocol(src, { acceptRelative: true })) {
    src = src.replace(/^\/\//, 'https://')
    const url = parseURL(src)
    const file = [
      `${ohash(url)}.js`, // force an extension
    ].filter(Boolean).join('-')
    const nuxt = tryUseNuxt()
    // Use cdnURL if available, otherwise fall back to baseURL
    const cdnURL = nuxt?.options.runtimeConfig?.app?.cdnURL || nuxt?.options.app?.cdnURL || ''
    const baseURL = cdnURL || nuxt?.options.app.baseURL || ''
    return { url: joinURL(joinURL(baseURL, assetsBaseURL), file), filename: file }
  }
  return { url: src }
}
async function downloadScript(opts: {
  src: string
  url: string
  filename?: string
  forceDownload?: boolean
  proxyRewrites?: ProxyRewrite[]
  integrity?: boolean | IntegrityAlgorithm
}, renderedScript: NonNullable<AssetBundlerTransformerOptions['renderedScript']>, fetchOptions?: FetchOptions, cacheMaxAge?: number) {
  const { src, url, filename, forceDownload, integrity, proxyRewrites } = opts
  if (src === url || !filename) {
    return
  }
  const storage = bundleStorage()
  const scriptContent = renderedScript.get(src)
  let res: Buffer | undefined = scriptContent instanceof Error ? undefined : scriptContent?.content
  if (!res) {
    // Use storage to cache the font data between builds
    // Include proxy in cache key to differentiate proxied vs non-proxied versions
    // Also include a hash of proxyRewrites content to handle different collectPrefix values
    const proxyRewritesHash = proxyRewrites?.length ? `-${ohash(proxyRewrites)}` : ''
    const cacheKey = proxyRewrites?.length ? `bundle-proxy:${filename.replace('.js', `${proxyRewritesHash}.js`)}` : `bundle:${filename}`
    const shouldUseCache = !forceDownload && await storage.hasItem(cacheKey) && !(await isCacheExpired(storage, filename, cacheMaxAge))

    if (shouldUseCache) {
      const cachedContent = await storage.getItemRaw<Buffer>(cacheKey)
      const meta = await storage.getItem(`bundle-meta:${filename}`) as { integrity?: string } | null
      renderedScript.set(url, {
        content: cachedContent!,
        size: cachedContent!.length / 1024,
        encoding: 'utf-8',
        src,
        filename,
        integrity: meta?.integrity,
      })
      return
    }
    let encoding
    let size = 0
    res = await $fetch.raw(src, { ...fetchOptions, responseType: 'arrayBuffer' }).then(async (r) => {
      if (!r.ok) {
        throw new Error(`Failed to fetch ${src} (HTTP ${r.status})`)
      }
      encoding = r.headers.get('content-encoding')
      const contentLength = r.headers.get('content-length')
      size = contentLength ? Number(contentLength) / 1024 : 0
      return Buffer.from(r._data || await r.arrayBuffer())
    })

    await storage.setItemRaw(`bundle:${filename}`, res)
    // Apply URL rewrites for proxy mode
    if (proxyRewrites?.length && res) {
      const content = res.toString('utf-8')
      const rewritten = rewriteScriptUrls(content, proxyRewrites)
      res = Buffer.from(rewritten, 'utf-8')
      logger.debug(`Rewrote ${proxyRewrites.length} URL patterns in ${filename}`)
    }

    // Calculate integrity hash after rewrites so the hash matches the served content
    const integrityHash = integrity && res
      ? calculateIntegrity(res, integrity === true ? 'sha384' : integrity)
      : undefined

    await storage.setItemRaw(cacheKey, res)
    // Save metadata with timestamp for cache expiration
    await storage.setItem(`bundle-meta:${filename}`, {
      timestamp: Date.now(),
      src,
      filename,
      integrity: integrityHash,
    })
    size = size || res!.length / 1024
    logger.info(`Downloading script ${colors.gray(`${src} → ${filename} (${size.toFixed(2)} kB ${encoding})${integrityHash ? ` [${integrityHash.slice(0, 15)}...]` : ''}`)}`)
    renderedScript.set(url, {
      content: res!,
      size,
      encoding,
      src,
      filename,
      integrity: integrityHash,
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
    if (nuxt.options._prepare) {
      return
    }
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
        // Skip test files - no need to bundle scripts in test code
        if (id.includes('.test.') || id.includes('.spec.'))
          return false
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
              // Compute registryKey for proxy config lookup
              let registryKey: string | undefined
              if (fnName !== 'useScript') {
                const baseName = fnName.replace(/^useScript/, '')
                registryKey = baseName.length > 0 ? baseName.charAt(0).toLowerCase() + baseName.slice(1) : undefined
              }
              if (fnName === 'useScript') {
                // do easy case first where first argument is a literal
                if (node.arguments[0]?.type === 'Literal') {
                  scriptSrcNode = node.arguments[0] as Literal & { start: number, end: number }
                }
                else if (node.arguments[0]?.type === 'ObjectExpression') {
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
                // Get registry config for this script
                const registryConfig = options.registryConfig?.[registryKey || ''] || {}

                const fnArg0 = {}

                // extract the options as the first argument that we'll use to reconstruct the src
                if (node.arguments[0]?.type === 'ObjectExpression') {
                  const optionsNode = node.arguments[0] as ObjectExpression
                  // extract literal values from the object to reconstruct the options
                  for (const prop of optionsNode.properties) {
                    if (prop.type === 'Property' && prop.value.type === 'Literal' && prop.key && 'name' in prop.key)
                      // @ts-expect-error untyped
                      fnArg0[prop.key.name] = prop.value.value
                  }

                  const srcProperty = node.arguments[0].properties.find(
                    (p: any) => (p.key?.name === 'src' || p.key?.value === 'src') && p?.value.type === 'Literal' && p.type === 'Property',
                  ) as Property | undefined
                  if ((srcProperty?.value as Literal)?.value) {
                    scriptSrcNode = srcProperty?.value as Literal & { start: number, end: number }
                  }
                }

                // If no src was found from function arguments, try to generate from registry config
                if (!scriptSrcNode) {
                  // Merge registry config with function arguments (function args take precedence)
                  const mergedOptions = { ...registryConfig, ...fnArg0 }

                  src = registryNode.scriptBundling && registryNode.scriptBundling(mergedOptions as InferInput<any>)
                  // not supported
                  if (src === false)
                    return
                }
              }

              // Check for dynamic src with bundle option - warn user and replace with 'unsupported'
              if (!scriptSrcNode && !src) {
                // This is a dynamic src case, check if bundle option is specified
                const hasBundleOption = node.arguments[1]?.type === 'ObjectExpression'
                  && (node.arguments[1] as ObjectExpression).properties.some(
                    (p: any) => (p.key?.name === 'bundle' || p.key?.value === 'bundle') && p.type === 'Property',
                  )

                if (hasBundleOption) {
                  const scriptOptionsArg = node.arguments[1] as ObjectExpression & { start: number, end: number }
                  const bundleProperty = scriptOptionsArg.properties.find(
                    (p: any) => (p.key?.name === 'bundle' || p.key?.value === 'bundle') && p.type === 'Property',
                  ) as Property & { start: number, end: number } | undefined

                  if (bundleProperty && bundleProperty.value.type === 'Literal') {
                    const bundleValue = bundleProperty.value.value
                    if (bundleValue === true || bundleValue === 'force' || String(bundleValue) === 'true') {
                      // Replace bundle value with 'unsupported' - runtime will handle the warning
                      const valueNode = bundleProperty.value as any
                      s.overwrite(valueNode.start, valueNode.end, `'unsupported'`)
                    }
                  }
                }
                return
              }

              if (scriptSrcNode || src) {
                src = src || (typeof scriptSrcNode?.value === 'string' ? scriptSrcNode?.value : false)
                if (src) {
                  let canBundle = options.defaultBundle === true || options.defaultBundle === 'force'
                  let forceDownload = options.defaultBundle === 'force'
                  // useScript
                  if (node.arguments[1]?.type === 'ObjectExpression') {
                    const scriptOptionsArg = node.arguments[1] as ObjectExpression & { start: number, end: number }
                    // second node needs to be an object with an property of assetStrategy and a value of 'bundle'
                    const bundleProperty = scriptOptionsArg.properties.find(
                      (p: any) => (p.key?.name === 'bundle' || p.key?.value === 'bundle') && p.type === 'Property',
                    ) as Property & { start: number, end: number } | undefined
                    if (bundleProperty && bundleProperty.value.type === 'Literal') {
                      const value = bundleProperty.value as Literal
                      const bundleValue = value.value
                      if (bundleValue !== true && bundleValue !== 'force' && String(bundleValue) !== 'true') {
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
                      forceDownload = bundleValue === 'force'
                    }
                  }
                  // @ts-expect-error untyped
                  const scriptOptions = node.arguments[0]?.properties?.find(
                    (p: any) => (p.key?.name === 'scriptOptions'),
                  ) as Property | undefined
                  // we need to check if scriptOptions contains bundle: true/false/'force', if it exists
                  // @ts-expect-error untyped
                  const bundleOption = scriptOptions?.value.properties?.find((prop) => {
                    return prop.type === 'Property' && prop.key?.name === 'bundle' && prop.value.type === 'Literal'
                  })
                  if (bundleOption) {
                    const bundleValue = bundleOption.value.value
                    canBundle = bundleValue === true || bundleValue === 'force' || String(bundleValue) === 'true'
                    forceDownload = bundleValue === 'force'
                  }
                  // Check for per-script first-party opt-out (firstParty: false)
                  // Check in three locations:
                  // 1. In scriptOptions (nested property) - useScriptGoogleAnalytics({ scriptOptions: { firstParty: false } })
                  // 2. In the second argument for direct options - useScript('...', { firstParty: false })
                  // 3. In the first argument's direct properties - useScript({ src: '...', firstParty: false })

                  // Check in scriptOptions (nested)
                  // @ts-expect-error untyped
                  const firstPartyOption = scriptOptions?.value.properties?.find((prop) => {
                    return prop.type === 'Property' && prop.key?.name === 'firstParty' && prop.value.type === 'Literal'
                  })
                  let firstPartyOptOut = firstPartyOption?.value.value === false

                  // Check in second argument (direct options)
                  if (!firstPartyOptOut && node.arguments[1]?.type === 'ObjectExpression') {
                    const secondArgFirstPartyProp = (node.arguments[1] as ObjectExpression).properties.find(
                      (p: any) => p.type === 'Property' && p.key?.name === 'firstParty' && p.value.type === 'Literal',
                    )
                    firstPartyOptOut = (secondArgFirstPartyProp as any)?.value.value === false
                  }

                  // Check in first argument's direct properties for useScript with object form
                  if (!firstPartyOptOut && node.arguments[0]?.type === 'ObjectExpression') {
                    const firstArgFirstPartyProp = (node.arguments[0] as ObjectExpression).properties.find(
                      (p: any) => p.type === 'Property' && p.key?.name === 'firstParty' && p.value.type === 'Literal',
                    )
                    firstPartyOptOut = (firstArgFirstPartyProp as any)?.value.value === false
                  }
                  if (canBundle) {
                    const { url: _url, filename } = normalizeScriptData(src, options.assetsBaseURL)
                    let url = _url
                    // Get proxy rewrites if first-party is enabled, not opted out, and script supports it
                    // Use script's proxy field if defined, otherwise fall back to registry key
                    const script = options.scripts?.find(s => s.import.name === fnName)
                    const proxyConfigKey = script?.proxy !== false ? (script?.proxy || registryKey) : undefined
                    const proxyRewrites = options.firstPartyEnabled && !firstPartyOptOut && proxyConfigKey && options.firstPartyCollectPrefix
                      ? getProxyConfig(proxyConfigKey, options.firstPartyCollectPrefix)?.rewrite
                      : undefined
                    try {
                      await downloadScript({ src, url, filename, forceDownload, proxyRewrites, integrity: options.integrity }, renderedScript, options.fetchOptions, options.cacheMaxAge)
                    }
                    catch (e: any) {
                      if (options.fallbackOnSrcOnBundleFail) {
                        logger.warn(`[Nuxt Scripts: Bundle Transformer] Failed to bundle ${src}. Fallback to remote loading.`)
                        url = src
                      }
                      else {
                        // Provide more helpful error message, especially for Docker/network issues
                        const errorMessage = e?.message || 'Unknown error'
                        if (errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('certificate')) {
                          logger.error(`[Nuxt Scripts: Bundle Transformer] Network issue while bundling ${src}: ${errorMessage}`)
                          logger.error(`[Nuxt Scripts: Bundle Transformer] Tip: Set 'fallbackOnSrcOnBundleFail: true' in module options or disable bundling in Docker environments`)
                        }
                        throw e
                      }
                    }

                    if (src === url) {
                      if (src && src.startsWith('/'))
                        logger.warn(`[Nuxt Scripts: Bundle Transformer] Relative scripts are already bundled. Skipping bundling for \`${src}\`.`)
                      else
                        logger.warn(`[Nuxt Scripts: Bundle Transformer] Failed to bundle ${src}.`)
                    }

                    // Get the integrity hash from rendered script
                    const scriptMeta = renderedScript.get(url)
                    const integrityHash = scriptMeta instanceof Error ? undefined : scriptMeta?.integrity

                    if (scriptSrcNode) {
                      // For useScript('src') pattern, we need to convert to object form to add integrity
                      if (integrityHash && fnName === 'useScript' && node.arguments[0]?.type === 'Literal') {
                        s.overwrite(scriptSrcNode.start, scriptSrcNode.end, `{ src: '${url}', integrity: '${integrityHash}', crossorigin: 'anonymous' }`)
                      }
                      else if (integrityHash && fnName === 'useScript' && node.arguments[0]?.type === 'ObjectExpression') {
                        // For useScript({ src: '...' }) pattern, update src and add integrity
                        s.overwrite(scriptSrcNode.start, scriptSrcNode.end, `'${url}'`)
                        const objArg = node.arguments[0] as ObjectExpression & { end: number }
                        s.appendLeft(objArg.end - 1, `, integrity: '${integrityHash}', crossorigin: 'anonymous'`)
                      }
                      else {
                        s.overwrite(scriptSrcNode.start, scriptSrcNode.end, `'${url}'`)
                      }
                    }
                    else {
                      // Handle case where we need to add scriptInput (registry scripts)
                      const integrityProps = integrityHash ? `, integrity: '${integrityHash}', crossorigin: 'anonymous'` : ''
                      if (node.arguments[0]) {
                        // There's at least one argument
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
                            if (srcProperty) {
                              s.overwrite(srcProperty.value.start, srcProperty.value.end, `'${url}'`)
                              if (integrityHash)
                                s.appendLeft(scriptInput.end - 1, integrityProps)
                            }
                            else {
                              s.appendRight(scriptInput.end - 1, `, src: '${url}'${integrityProps}`)
                            }
                          }
                        }
                        else {
                          // @ts-expect-error untyped
                          s.appendRight(node.arguments[0].start + 1, ` scriptInput: { src: '${url}'${integrityProps} }, `)
                        }
                      }
                      else {
                        // No arguments at all, need to create the first argument
                        // @ts-expect-error untyped
                        s.appendRight(node.callee.end, `({ scriptInput: { src: '${url}'${integrityProps} } })`)
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
