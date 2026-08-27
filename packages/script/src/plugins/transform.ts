import type { Nuxt } from '@nuxt/schema'
import type { FetchOptions } from 'ofetch'
import type { SourceMapInput } from 'rollup'
import type { VitePlugin } from 'unplugin'
import type { InferInput } from 'valibot'
import type { ProxyConfig, ProxyRewrite, RegistryScript } from '../runtime/types'
import { createHash } from 'node:crypto'
import fsp from 'node:fs/promises'
import { tryUseNuxt, useNuxt } from '@nuxt/kit'
import { colors } from 'consola/utils'
import MagicString from 'magic-string'
import { $fetch } from 'ofetch'
import { hash as ohash } from 'ohash'
import { parseAndWalk } from 'oxc-walker'
import { join } from 'pathe'
import { hasProtocol, joinURL, parseURL } from 'ufo'
import { createUnplugin } from 'unplugin'
import { bundleStorage } from '../assets'
import { logger } from '../logger'
import { getBundleResolve } from '../registry'
import { rewriteScriptUrlsAST } from './rewrite-ast'
import { isVue } from './util'

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000

const PROTOCOL_RELATIVE_RE = /^\/\//
// Ids carry a query in dev and for SFC blocks, so every extension match allows one.
const VUE_RE = /\.vue(?:\?|$)/
const JS_RE = /\.[cm]?[jt]sx?(?:\?|$)/
const TEST_RE = /\.(?:test|spec)\./
// Every integration is called through `useScript` or `useScriptX`, so a module without
// that substring can never need this transform. The bundler applies it, natively where
// it can, so the hook is not called at all for the rest of the graph.
const USE_SCRIPT_CODE_MARKER = 'useScript'
const UPPERCASE_RE = /^[A-Z]$/
const USE_SCRIPT_RE = /^useScript/

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
  assetsBaseURL?: string
  /**
   * Runtime component directory. Bundling waits until the final module graph
   * proves that an auto-registered component has a real importer.
   */
  componentDir?: string
  scripts?: Required<RegistryScript>[]
  /**
   * Merged configuration from both scripts.registry and runtimeConfig.public.scripts
   * Used to provide default options to script bundling functions when no arguments are provided
   */
  registryConfig?: Record<string, any>
  /**
   * Pre-built proxy configs from setupFirstParty. Empty object if first-party is disabled.
   */
  proxyConfigs?: Record<string, ProxyConfig>
  /**
   * Proxy prefix for first-party mode. Used to derive rewrite targets from domains.
   */
  proxyPrefix?: string
  /** Map of real third-party domain → path alias, used to hide hostnames in proxy URLs. */
  domainAliases?: Record<string, string>
  fallbackOnSrcOnBundleFail?: boolean
  fetchOptions?: FetchOptions
  cacheMaxAge?: number
  /**
   * Enable automatic integrity hash generation for bundled scripts.
   * When enabled, calculates SRI hash and injects integrity attribute.
   * @default false
   */
  integrity?: boolean | IntegrityAlgorithm
  /**
   * The active Nuxt instance. Used to resolve the build directory and register the
   * `build:done` copy hook. Defaults to `useNuxt()`; pass it explicitly to run the
   * transformer without an active Nuxt context (e.g. unit tests).
   */
  nuxt?: Nuxt
  renderedScript?: Map<string, RenderedScriptMeta | Error>
  /**
   * Set of registry script keys that use Partytown.
   * Scripts in this set skip API call rewrites (__nuxtScripts.*) since Partytown's
   * resolveUrl hook handles network interception in the web worker instead.
   */
  partytownScripts?: Set<string>
}

function safeFilename(h: string): string {
  // Prefix hashes starting with '-' — Nitro's publicAssets handler cannot serve
  // files whose names begin with a dash (they get omitted from the asset manifest).
  return `${h.startsWith('-') ? `_${h.slice(1)}` : h}.js`
}

function buildAssetUrl(filename: string, assetsBaseURL: string = '/_scripts/assets'): string {
  const nuxt = tryUseNuxt()
  const cdnURL = nuxt?.options.runtimeConfig?.app?.cdnURL || nuxt?.options.app?.cdnURL || ''
  const baseURL = cdnURL || nuxt?.options.app.baseURL || ''
  return joinURL(joinURL(baseURL, assetsBaseURL), filename)
}

function normalizeScriptData(src: string, assetsBaseURL: string = '/_scripts/assets'): { url: string, filename?: string } {
  if (hasProtocol(src, { acceptRelative: true })) {
    src = src.replace(PROTOCOL_RELATIVE_RE, 'https://')
    const url = parseURL(src)
    const file = safeFilename(ohash(url))
    return { url: buildAssetUrl(file, assetsBaseURL), filename: file }
  }
  return { url: src }
}

interface DownloadScriptOptions {
  src: string
  url: string
  filename?: string
  forceDownload?: boolean
  proxyRewrites?: ProxyRewrite[]
  sdkPatches?: ProxyConfig['sdkPatches']
  integrity?: boolean | IntegrityAlgorithm
  skipApiRewrites?: boolean
  neutralizeCanvas?: boolean
  assetsBaseURL?: string
}

interface PendingComponentBundle {
  componentId: string
  downloadOptions: DownloadScriptOptions
  placeholderIntegrity?: string
  placeholderUrl: string
}

/**
 * Dropping an unresolved hash must remove the whole `, integrity: ..., crossorigin: 'anonymous'`
 * span: replacing only the placeholder would leave `integrity: ''` plus crossorigin, which
 * forces CORS request mode and breaks origins serving scripts without CORS headers.
 *
 * The patch runs against final minified chunk code, where quote style and whitespace are
 * not ours to choose (oxc renders every literal as a template literal), so match the two
 * properties structurally instead of comparing exact source text.
 */
function integrityPlaceholderRemoval(placeholderIntegrity: string): RegExp {
  const token = escapeRegExp(placeholderIntegrity)
  return new RegExp(`,\\s*integrity\\s*:\\s*["'\`]${token}["'\`]\\s*,\\s*crossorigin\\s*:\\s*["'\`][^"'\`]*["'\`]`, 'g')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function downloadScript(opts: DownloadScriptOptions, renderedScript: NonNullable<AssetBundlerTransformerOptions['renderedScript']>, fetchOptions?: FetchOptions, cacheMaxAge?: number): Promise<{ url: string, filename?: string } | undefined> {
  const { src, url, filename, forceDownload, integrity, proxyRewrites, sdkPatches, skipApiRewrites, neutralizeCanvas, assetsBaseURL } = opts
  if (src === url || !filename) {
    return
  }
  const storage = bundleStorage()
  let res: Buffer | undefined
  let encoding: string | null | undefined
  let size = 0
  let fetched = false

  // Cache patched bundles under a separate prefix so they don't collide with
  // raw bundles. Hash the rewrite/patch inputs so changes to either (different
  // proxyPrefix, new sdkPatches domain, etc.) invalidate the cache.
  const hasRewrites = !!(proxyRewrites?.length || sdkPatches?.length)
  const rewriteHash = hasRewrites ? `-${ohash({ proxyRewrites, sdkPatches })}` : ''
  const cacheKey = hasRewrites ? `bundle-patched:${filename.replace('.js', `${rewriteHash}.js`)}` : `bundle:${filename}`
  const shouldUseCache = !forceDownload && await storage.hasItem(cacheKey) && !(await isCacheExpired(storage, filename, cacheMaxAge))

  if (shouldUseCache) {
    res = await storage.getItemRaw<Buffer>(cacheKey) as Buffer
    encoding = 'utf-8'
  }
  else {
    res = await $fetch.raw(src, { ...fetchOptions, responseType: 'arrayBuffer' }).then(async (r) => {
      if (!r.ok) {
        throw new Error(`Failed to fetch ${src} (HTTP ${r.status})`)
      }
      encoding = r.headers.get('content-encoding')
      const contentLength = r.headers.get('content-length')
      size = contentLength ? Number(contentLength) / 1024 : 0
      return Buffer.from(r._data || await r.arrayBuffer())
    })
    fetched = true

    await storage.setItemRaw(`bundle:${filename}`, res)
    // Apply AST rewrites at build time. Runs when either proxy rewrites are
    // present (proxy mode) or bundle-only sdkPatches are configured (e.g.
    // Fathom's neutralize-domain-check).
    if (hasRewrites && res) {
      const content = res.toString('utf-8')
      const rewritten = rewriteScriptUrlsAST(content, filename, proxyRewrites ?? [], sdkPatches, { skipApiRewrites, neutralizeCanvas })
      res = Buffer.from(rewritten, 'utf-8')
      logger.debug(`Rewrote ${proxyRewrites?.length ?? 0} URL patterns + ${sdkPatches?.length ?? 0} sdk patches in ${filename}`)
    }

    await storage.setItemRaw(cacheKey, res)
    await storage.setItem(`bundle-meta:${filename}`, {
      timestamp: Date.now(),
      src,
      filename,
    })
  }

  if (!res) {
    return
  }

  // Content-address the public filename so when the upstream script or proxy
  // rewrites change between deployments, the URL changes too. Without this,
  // long-cached JS at an unchanged URL ends up served against a new integrity
  // hash in fresh HTML, breaking SRI on the second deploy.
  const contentHash = createHash('sha256').update(res).digest('hex').slice(0, 16)
  const publicFilename = safeFilename(contentHash)
  const publicUrl = buildAssetUrl(publicFilename, assetsBaseURL)

  const integrityHash = integrity
    ? calculateIntegrity(res, integrity === true ? 'sha384' : integrity)
    : undefined

  size = size || res.length / 1024
  if (fetched) {
    logger.info(`Downloading script ${colors.gray(`${src} → ${publicFilename} (${size.toFixed(2)} kB ${encoding})${integrityHash ? ` [${integrityHash.slice(0, 15)}...]` : ''}`)}`)
  }
  renderedScript.set(publicUrl, {
    content: res,
    size,
    encoding: encoding || undefined,
    src,
    filename: publicFilename,
    integrity: integrityHash,
  })
  return { url: publicUrl, filename: publicFilename }
}

async function resolveScriptBundle(
  downloadOptions: DownloadScriptOptions,
  renderedScript: NonNullable<AssetBundlerTransformerOptions['renderedScript']>,
  options: Pick<AssetBundlerTransformerOptions, 'cacheMaxAge' | 'fallbackOnSrcOnBundleFail' | 'fetchOptions'>,
): Promise<{ integrity?: string, url: string }> {
  const { src } = downloadOptions
  let { url } = downloadOptions
  const result = await downloadScript(downloadOptions, renderedScript, options.fetchOptions, options.cacheMaxAge).catch((error: any) => {
    if (options.fallbackOnSrcOnBundleFail) {
      logger.warn(`[Nuxt Scripts: Bundle Transformer] Failed to bundle ${src}. Fallback to remote loading.`)
      return undefined
    }

    const errorMessage = error?.message || 'Unknown error'
    if (errorMessage.includes('timeout') || errorMessage.includes('network') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('certificate')) {
      logger.error(`[Nuxt Scripts: Bundle Transformer] Network issue while bundling ${src}: ${errorMessage}`)
      logger.error(`[Nuxt Scripts: Bundle Transformer] Tip: Set 'fallbackOnSrcOnBundleFail: true' in module options or disable bundling in Docker environments`)
    }
    throw error
  })

  if (result)
    url = result.url
  else if (options.fallbackOnSrcOnBundleFail)
    url = src

  if (src === url) {
    if (src.startsWith('/'))
      logger.warn(`[Nuxt Scripts: Bundle Transformer] Relative scripts are already bundled. Skipping bundling for \`${src}\`.`)
    else
      logger.warn(`[Nuxt Scripts: Bundle Transformer] Failed to bundle ${src}.`)
  }

  const scriptMeta = renderedScript.get(url)
  return {
    integrity: scriptMeta instanceof Error ? undefined : scriptMeta?.integrity,
    url,
  }
}

function getComponentId(id: string, componentDir?: string): string | undefined {
  if (!componentDir)
    return
  const queryIndex = id.indexOf('?')
  const componentId = queryIndex === -1 ? id : id.slice(0, queryIndex)
  if (componentId === componentDir || componentId.startsWith(`${componentDir}/`))
    return componentId
}

export function NuxtScriptBundleTransformer(options: AssetBundlerTransformerOptions = {
  renderedScript: new Map(),
}) {
  const nuxt = options.nuxt ?? useNuxt()
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
      await fsp.writeFile(join(cacheDir, content.filename), content.content)
      logger.debug(colors.gray(`  ├─ ${url} → ${joinURL(content.src)} (${content.size.toFixed(2)} kB ${content.encoding})`))
    }))
  })

  return createUnplugin(() => {
    const pendingComponentBundles: PendingComponentBundle[] = []
    const replacements = new Map<string | RegExp, string>()

    /**
     * A pending component is unused unless some importer path reaches a module outside
     * the runtime components dir. Direct importers alone miss nested widgets: an
     * auto-registered parent that nothing references can still make its children look
     * used. Cycles (A imports B imports A) are guarded by the visited set.
     */
    function reachesOutsideComponentDir(componentId: string, getModuleInfo: (id: string) => { importers?: string[], dynamicImporters?: string[] } | undefined | null): boolean {
      if (!options.componentDir)
        return true
      const stack = [componentId]
      const visited = new Set<string>()
      while (stack.length > 0) {
        const id = stack.pop()!
        if (visited.has(id))
          continue
        visited.add(id)
        if (getComponentId(id, options.componentDir) === undefined)
          return true
        const info = getModuleInfo(id)
        if (!info)
          continue
        stack.push(...(info.importers ?? []), ...(info.dynamicImporters ?? []))
      }
      return false
    }

    function applyReplacements(code: string): string {
      let result: MagicString | undefined
      for (const [placeholder, replacement] of replacements) {
        if (placeholder instanceof RegExp) {
          placeholder.lastIndex = 0
          for (let match = placeholder.exec(code); match; match = placeholder.exec(code)) {
            result ??= new MagicString(code)
            result.remove(match.index, match.index + match[0].length)
            if (match[0].length === 0)
              break
          }
          continue
        }
        let offset = 0
        while (offset < code.length) {
          const index = code.indexOf(placeholder, offset)
          if (index === -1)
            break
          result ??= new MagicString(code)
          result.overwrite(index, index + placeholder.length, replacement)
          offset = index + placeholder.length
        }
      }
      return result ? result.toString() : code
    }

    const outputHooks: Pick<VitePlugin, 'generateBundle'> = {
      async generateBundle(_outputOptions, bundle) {
        // Watch rebuilds re-emit chunks from cached transformed modules whose code still
        // carries placeholder tokens, while replacements persist across emissions. So
        // resolution and patching are independent steps: resolve a consumed snapshot of
        // the pendings when one exists, then always re-patch emitted chunks whenever we
        // hold any replacement.
        if (pendingComponentBundles.length > 0) {
          // Splice before awaiting: transforms still running while these downloads
          // resolve must not have their freshly registered pendings wiped here.
          const batch = pendingComponentBundles.splice(0, pendingComponentBundles.length)

          // Bundling has finished handing us the final module graph here and the bundler
          // awaits this hook before writing files, so classification, downloads and patching
          // land in a single deterministic point. An awaited renderStart cannot do this job:
          // rolldown renders chunks without waiting for it, which shipped unresolved
          // placeholders whenever a download outlived rendering.
          await Promise.all(batch.map(async (pending) => {
            const isUnusedComponent = !reachesOutsideComponentDir(pending.componentId, id => this.getModuleInfo(id))

            if (isUnusedComponent) {
              replacements.set(pending.placeholderUrl, pending.downloadOptions.src)
              if (pending.placeholderIntegrity)
                replacements.set(integrityPlaceholderRemoval(pending.placeholderIntegrity), '')
              return
            }

            // Downloads overlap across pendings: resolveScriptBundle rethrows fatal failures
            // (only falling back when explicitly configured), and Promise.all preserves that.
            const result = await resolveScriptBundle(pending.downloadOptions, renderedScript, options)

            replacements.set(pending.placeholderUrl, result.url)
            if (pending.placeholderIntegrity) {
              replacements.set(
                result.integrity ? pending.placeholderIntegrity : integrityPlaceholderRemoval(pending.placeholderIntegrity),
                result.integrity ?? '',
              )
            }
          }))
        }

        if (replacements.size === 0)
          return

        // Mutating `bundle` entries is honored on write (rollup contract); renderChunk-based
        // patching was not: rolldown may render before any map entry existed.
        for (const file of Object.values(bundle)) {
          if (file.type !== 'chunk')
            continue
          const patched = applyReplacements(file.code)
          if (patched !== file.code) {
            // Edits only touch token spans inserted at transform time, so the existing
            // sourcemap stays usable; regenerating one here would lose all chunk mappings.
            file.code = patched
          }
        }
      },
    }

    return {
      name: 'nuxt:scripts:bundler-transformer',

      vite: outputHooks,

      transform: {
        filter: {
          id: {
            include: [VUE_RE, JS_RE],
            exclude: [TEST_RE],
          },
          code: USE_SCRIPT_CODE_MARKER,
        },
        async handler(code, id) {
          // A `.vue` id reaches us once per SFC block. Only script and template are ours.
          if (VUE_RE.test(id) && !isVue(id, { type: ['template', 'script'] }))
            return

          const s = new MagicString(code)
          const deferredOps: (() => Promise<void>)[] = []
          parseAndWalk(code, id, (_node) => {
            const calleeName = (_node as any).callee?.name
            if (!calleeName)
              return
            // check it starts with useScriptX where X must be a A-Z alphabetical letter
            const isValidCallee = calleeName === 'useScript' || (calleeName?.startsWith('useScript') && UPPERCASE_RE.test(calleeName?.charAt(9)) && !calleeName.startsWith('useScriptTrigger') && !calleeName.startsWith('useScriptEvent'))
            if (
              _node.type === 'CallExpression'
              && (_node as any).callee.type === 'Identifier'
              && isValidCallee
            ) {
            // we're either dealing with useScript or an integration such as useScriptHotjar, we need to handle
            // both cases
              const fnName = (_node as any).callee?.name
              const node = _node as any
              let scriptSrcNode: { start: number, end: number, value: any } | undefined
              let src: false | string | undefined
              let registryConfig: Record<string, any> = {}
              // Compute registryKey for proxy config lookup
              let registryKey: string | undefined
              if (fnName !== 'useScript') {
                const baseName = fnName.replace(USE_SCRIPT_RE, '')
                registryKey = baseName.length > 0 ? baseName.charAt(0).toLowerCase() + baseName.slice(1) : undefined
              }
              if (fnName === 'useScript') {
              // do easy case first where first argument is a literal
                if (node.arguments[0]?.type === 'Literal') {
                  scriptSrcNode = node.arguments[0]
                }
                else if (node.arguments[0]?.type === 'ObjectExpression') {
                  const srcProperty = node.arguments[0].properties.find(
                    (p: any) => (p.key?.name === 'src' || p.key?.value === 'src') && p?.value.type === 'Literal',
                  )
                  scriptSrcNode = srcProperty?.value
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
                const bundleResolve = getBundleResolve(registryNode as RegistryScript)
                if (!bundleResolve && !registryNode.src)
                  return

                // integration case
                // Get registry config for this script
                registryConfig = options.registryConfig?.[registryKey || ''] || {}

                const fnArg0: Record<string, any> = {}

                // extract the options as the first argument that we'll use to reconstruct the src
                if (node.arguments[0]?.type === 'ObjectExpression') {
                  const optionsNode = node.arguments[0]
                  // extract literal values from the object to reconstruct the options
                  for (const prop of optionsNode.properties) {
                    if (prop.type === 'Property' && prop.value.type === 'Literal' && prop.key && 'name' in prop.key)
                      fnArg0[prop.key.name] = prop.value.value
                  }

                  const srcProperty = node.arguments[0].properties.find(
                    (p: any) => (p.key?.name === 'src' || p.key?.value === 'src') && p?.value.type === 'Literal' && p.type === 'Property',
                  )
                  if (srcProperty?.value?.value) {
                    scriptSrcNode = srcProperty?.value
                  }
                }

                // If no src was found from function arguments, try to generate from registry config
                if (!scriptSrcNode) {
                // Merge registry config with function arguments (function args take precedence)
                  const mergedOptions = { ...registryConfig, ...fnArg0 }

                  src = bundleResolve && bundleResolve(mergedOptions as InferInput<any>)
                  // not supported
                  if (src === false)
                    return
                  if (!src && registryNode.src)
                    src = registryNode.src
                }
              }

              // Check for dynamic src with bundle option - warn user and replace with 'unsupported'
              if (!scriptSrcNode && !src) {
              // This is a dynamic src case, check if bundle option is specified
                const hasBundleOption = node.arguments[1]?.type === 'ObjectExpression'
                  && node.arguments[1].properties.some(
                    (p: any) => (p.key?.name === 'bundle' || p.key?.value === 'bundle') && p.type === 'Property',
                  )

                if (hasBundleOption) {
                  const scriptOptionsArg = node.arguments[1]
                  const bundleProperty = scriptOptionsArg.properties.find(
                    (p: any) => (p.key?.name === 'bundle' || p.key?.value === 'bundle') && p.type === 'Property',
                  )

                  if (bundleProperty && bundleProperty.value.type === 'Literal') {
                    const bundleValue = bundleProperty.value.value
                    if (bundleValue === true || bundleValue === 'force' || String(bundleValue) === 'true') {
                    // Replace bundle value with 'unsupported' - runtime will handle the warning
                      s.overwrite(bundleProperty.value.start, bundleProperty.value.end, `'unsupported'`)
                    }
                  }
                }
                return
              }

              if (scriptSrcNode || src) {
                src = src || (typeof scriptSrcNode?.value === 'string' ? scriptSrcNode?.value : false)
                if (src) {
                  // Registry composables: bundle when the script declares bundle capability.
                  // Plain useScript() calls require explicit bundle: true opt-in.
                  const registryScript = fnName !== 'useScript'
                    ? options.scripts?.find(s => s.import.name === fnName)
                    : undefined
                  let canBundle = !!registryScript?.bundle
                  let forceDownload = false
                  let explicitBundleInCall = false
                  // useScript
                  if (node.arguments[1]?.type === 'ObjectExpression') {
                    const scriptOptionsArg = node.arguments[1]
                    // second node needs to be an object with an property of assetStrategy and a value of 'bundle'
                    const bundleProperty = scriptOptionsArg.properties.find(
                      (p: any) => (p.key?.name === 'bundle' || p.key?.value === 'bundle') && p.type === 'Property',
                    )
                    if (bundleProperty && bundleProperty.value.type === 'Literal') {
                      explicitBundleInCall = true
                      const bundleValue = bundleProperty.value.value
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
                        )
                        s.remove(bundleProperty.start, nextProperty ? nextProperty.start : bundleProperty.end)
                      }
                      canBundle = true
                      forceDownload = bundleValue === 'force'
                    }
                  }
                  const scriptOptions = node.arguments[0]?.properties?.find(
                    (p: any) => (p.key?.name === 'scriptOptions'),
                  )
                  // we need to check if scriptOptions contains bundle: true/false/'force', if it exists
                  const bundleOption = scriptOptions?.value.properties?.find((prop: any) => {
                    return prop.type === 'Property' && prop.key?.name === 'bundle' && prop.value.type === 'Literal'
                  })
                  if (bundleOption) {
                    explicitBundleInCall = true
                    const bundleValue = bundleOption.value.value
                    canBundle = bundleValue === true || bundleValue === 'force' || String(bundleValue) === 'true'
                    forceDownload = bundleValue === 'force'
                  }
                  // Inherit bundle setting from registry config (nuxt.config) when not explicitly set in the call
                  if (!explicitBundleInCall && registryConfig?.scriptOptions?.bundle !== undefined) {
                    const bundleValue = registryConfig.scriptOptions.bundle
                    canBundle = bundleValue === true || bundleValue === 'force' || String(bundleValue) === 'true'
                    forceDownload = bundleValue === 'force'
                  }
                  // Check for per-script proxy opt-out
                  // Check in three locations:
                  // 1. In scriptOptions (nested) - useScriptGA({ scriptOptions: { proxy: false } })
                  // 2. In second argument (direct) - useScript('...', { proxy: false })
                  // 3. In first argument's properties - useScript({ src: '...', proxy: false })

                  const rpiOption = scriptOptions?.value.properties?.find((prop: any) => {
                    return prop.type === 'Property' && prop.key?.name === 'proxy' && prop.value.type === 'Literal'
                  })
                  let firstPartyOptOut = rpiOption?.value.value === false

                  if (!firstPartyOptOut && node.arguments[1]?.type === 'ObjectExpression') {
                    const secondArgProp = node.arguments[1].properties.find(
                      (p: any) => p.type === 'Property' && p.key?.name === 'proxy' && p.value.type === 'Literal',
                    )
                    firstPartyOptOut = secondArgProp?.value.value === false
                  }

                  if (!firstPartyOptOut && node.arguments[0]?.type === 'ObjectExpression') {
                    const firstArgProp = node.arguments[0].properties.find(
                      (p: any) => p.type === 'Property' && p.key?.name === 'proxy' && p.value.type === 'Literal',
                    )
                    firstPartyOptOut = firstArgProp?.value.value === false
                  }
                  if (canBundle) {
                    const { url: _url, filename } = normalizeScriptData(src, options.assetsBaseURL)
                    // Get proxy rewrites if first-party is enabled, not opted out, and script supports it
                    // Use script's proxy alias if defined, otherwise fall back to registry key
                    const script = options.scripts?.find(s => s.import.name === fnName)
                    const hasReverseProxy = !!script?.proxy
                    const proxyConfigKey = hasReverseProxy ? (typeof script?.proxy === 'string' ? script.proxy : registryKey) : undefined
                    const proxyConfig = !firstPartyOptOut && proxyConfigKey
                      ? options.proxyConfigs?.[proxyConfigKey]
                      : undefined
                    // Derive rewrites from domains: { from: domain, to: proxyPrefix/domain }
                    // Skip wildcard patterns — those exist only for runtime allowlist matching of
                    // dynamically-constructed URLs (e.g. ga-audiences geo-localized cctlds) and have
                    // no literal form to rewrite at build time.
                    const proxyRewrites = proxyConfig?.domains?.filter(domain => !domain.includes('*')).map(domain => ({
                      from: domain,
                      to: `${options.proxyPrefix}/${options.domainAliases?.[domain] ?? domain}`,
                    }))
                    // Bundle-only SDK patches (independent of proxy). Used when bundling
                    // a script that needs neutralize-domain-check etc. but should keep
                    // sending requests directly to its origin (e.g. Fathom).
                    // When both are defined, proxyConfig.sdkPatches wins — proxy patches
                    // are typically tuned for the rewritten URL set and should take precedence.
                    const bundleConfig = typeof script?.bundle === 'object' ? script.bundle : undefined
                    const sdkPatches = proxyConfig?.sdkPatches ?? bundleConfig?.sdkPatches
                    // Skip API rewrites (sendBeacon/fetch/XHR/Image → __nuxtScripts.*) when:
                    // 1. Partytown is active (uses resolveUrl instead), OR
                    // 2. No proxy is active (no intercept plugin loaded — calls would crash)
                    const skipApiRewrites = !!(registryKey && options.partytownScripts?.has(registryKey))
                      || !proxyConfig
                    // Gate canvas fingerprinting neutralization on the script's hardware privacy flag
                    const neutralizeCanvas = proxyConfig?.privacy !== undefined
                      && typeof proxyConfig.privacy === 'object'
                      ? (proxyConfig.privacy.hardware ?? true)
                      : true

                    const rewriteScriptCall = (url: string, integrityHash?: string) => {
                      if (scriptSrcNode) {
                      // For useScript('src') pattern, we need to convert to object form to add integrity
                        if (integrityHash && fnName === 'useScript' && node.arguments[0]?.type === 'Literal') {
                          s.overwrite(scriptSrcNode.start, scriptSrcNode.end, `{ src: '${url}', integrity: '${integrityHash}', crossorigin: 'anonymous' }`)
                        }
                        else if (integrityHash && fnName === 'useScript' && node.arguments[0]?.type === 'ObjectExpression') {
                        // For useScript({ src: '...' }) pattern, update src and add integrity
                          s.overwrite(scriptSrcNode.start, scriptSrcNode.end, `'${url}'`)
                          s.appendLeft(node.arguments[0].end - 1, `, integrity: '${integrityHash}', crossorigin: 'anonymous'`)
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
                          const optionsNode = node.arguments[0]
                          // check if there's a scriptInput property
                          const scriptInputProperty = optionsNode.properties.find(
                            (p: any) => p.key?.name === 'scriptInput' || p.key?.value === 'scriptInput',
                          )
                          // see if there is a script input on it
                          if (scriptInputProperty) {
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
                            s.appendRight(node.arguments[0].start + 1, ` scriptInput: { src: '${url}'${integrityProps} }, `)
                          }
                        }
                        else {
                        // No arguments at all, replace empty () with new argument
                          s.overwrite(node.callee.end, node.end, `({ scriptInput: { src: '${url}'${integrityProps} } })`)
                        }
                      }
                    }

                    const downloadOptions: DownloadScriptOptions = {
                      src: src as string,
                      url: _url,
                      filename,
                      forceDownload,
                      proxyRewrites,
                      sdkPatches,
                      integrity: options.integrity,
                      skipApiRewrites,
                      neutralizeCanvas,
                      assetsBaseURL: options.assetsBaseURL,
                    }
                    const componentId = nuxt.options.dev || nuxt.options.builder !== '@nuxt/vite-builder'
                      ? undefined
                      : getComponentId(id, options.componentDir)

                    // Nuxt emits every auto-registered component as an entry before it
                    // knows which components the application imports. Wait for the final
                    // graph so unused widgets do not trigger third-party downloads.
                    if (componentId) {
                      const token = createHash('sha256').update(`${id}:${node.start}:${src}`).digest('hex').slice(0, 16)
                      const placeholderUrl = `__NUXT_SCRIPT_BUNDLE_${token}__`
                      const placeholderIntegrity = options.integrity ? `__NUXT_SCRIPT_INTEGRITY_${token}__` : undefined
                      pendingComponentBundles.push({ componentId, downloadOptions, placeholderIntegrity, placeholderUrl })
                      deferredOps.push(async () => rewriteScriptCall(placeholderUrl, placeholderIntegrity))
                    }
                    else {
                      deferredOps.push(async () => {
                        const result = await resolveScriptBundle(downloadOptions, renderedScript, options)
                        rewriteScriptCall(result.url, result.integrity)
                      })
                    }
                  }
                }
              }
            }
          })

          for (const op of deferredOps) {
            await op()
          }

          if (s.hasChanged()) {
            return {
              code: s.toString(),
              map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
            }
          }
        },
      },
    }
  })
}
