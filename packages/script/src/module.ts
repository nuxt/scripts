import type { FetchOptions } from 'ofetch'
import type { ProxyDevtoolsScript } from './devtools'
import type { NormalizedRegistryEntry } from './normalize'
import type { ProxyPrivacyInput } from './runtime/server/utils/privacy'
import type {
  FirstPartyPrivacy,
  NuxtConfigScriptRegistry,
  NuxtUseScriptInput,
  NuxtUseScriptOptionsSerializable,
  ProxyConfig,
  RegistryScript,
  RegistryScriptKey,
  RegistryScripts,
  ResolvedProxyAutoInject,
} from './runtime/types'
import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import {
  addBuildPlugin,
  addComponentsDir,
  addImports,
  addPluginTemplate,
  addServerHandler,
  addTemplate,
  createResolver,
  defineNuxtModule,
  hasNuxtModule,
} from '@nuxt/kit'
import { defu } from 'defu'
import { resolve as resolvePath_ } from 'pathe'
import { readPackageJSON } from 'pkg-types'
import { setupPublicAssetStrategy } from './assets'
import { buildDevtoolsData, buildDevtoolsEntry, setupDevtools } from './devtools'
import { installNuxtModule } from './kit'
import { logger } from './logger'
import { extractRequiredFields, migrateDeprecatedRegistryKeys, normalizeRegistryConfig } from './normalize'
import { NuxtScriptsCheckScripts } from './plugins/check-scripts'
import { generateInterceptPluginContents } from './plugins/intercept'
import { NuxtScriptBundleTransformer } from './plugins/transform'
import { buildProxyConfigsFromRegistry, generatePartytownResolveUrl, getPartytownForwards, registry, resolveCapabilities } from './registry'
import { registerTypeTemplates, templatePlugin, templateTriggerResolver } from './templates'

export type { FirstPartyPrivacy }

/**
 * Partytown forward config for registry scripts.
 * Scripts not listed here are likely incompatible due to DOM access requirements.
 * @see https://partytown.qwik.dev/forwarding-events
 */
// Matches self-closing PascalCase or kebab-case tags starting with "Script"/"script-"
// e.g. <ScriptYouTubePlayer video-id="x" /> or <script-youtube-player />
const SELF_CLOSING_SCRIPT_RE = /<((?:Script[A-Z]|script-)\w[\w-]*)\b([^>]*?)\/\s*>/g

/**
 * Expand self-closing `<Script*>` component tags in page files to work around
 * a Nuxt core regex issue (nuxt `SFC_SCRIPT_RE` uses case-insensitive matching).
 */
function fixSelfClosingScriptComponents(nuxt: any) {
  function expandTags(content: string): string | null {
    SELF_CLOSING_SCRIPT_RE.lastIndex = 0
    if (!SELF_CLOSING_SCRIPT_RE.test(content))
      return null
    SELF_CLOSING_SCRIPT_RE.lastIndex = 0
    return content.replace(SELF_CLOSING_SCRIPT_RE, (_, tag, attrs) => `<${tag}${attrs.trimEnd()}></${tag}>`)
  }

  function fixFile(filePath: string) {
    if (!existsSync(filePath))
      return
    const content = readFileSync(filePath, 'utf-8')
    const fixed = expandTags(content)
    if (fixed)
      nuxt.vfs[filePath] = fixed
  }

  function scanDir(dir: string) {
    if (!existsSync(dir))
      return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolvePath_(dir, entry.name)
      if (entry.isDirectory())
        scanDir(fullPath)
      else if (entry.name.endsWith('.vue'))
        fixFile(fullPath)
    }
  }

  const pagesDirs = new Set<string>()
  for (const layer of nuxt.options._layers) {
    pagesDirs.add(resolvePath_(
      layer.config.srcDir,
      layer.config.dir?.pages || 'pages',
    ))
  }
  for (const dir of pagesDirs) scanDir(dir)

  // Keep VFS entries fresh during dev HMR
  if (nuxt.options.dev) {
    nuxt.hook('builder:watch', (_event: string, relativePath: string) => {
      if (!relativePath.endsWith('.vue'))
        return
      for (const layer of nuxt.options._layers) {
        const fullPath = resolvePath_(layer.config.srcDir, relativePath)
        for (const dir of pagesDirs) {
          if (fullPath.startsWith(`${dir}/`)) {
            fixFile(fullPath)
            return
          }
        }
      }
    })
  }
}

const UPPER_RE = /([A-Z])/g
const toScreamingSnake = (s: string) => s.replace(UPPER_RE, '_$1').toUpperCase()

const PROXY_SECRET_ENV_KEY = 'NUXT_SCRIPTS_PROXY_SECRET'
const PROXY_SECRET_ENV_LINE_RE = /^NUXT_SCRIPTS_PROXY_SECRET=/m
const PROXY_SECRET_ENV_VALUE_RE = /^NUXT_SCRIPTS_PROXY_SECRET=(.+)$/m

export interface ResolvedProxySecret {
  secret: string
  /** True when the secret exists only in memory (dev-only fallback; won't survive restarts). */
  ephemeral: boolean
  /** Where the secret came from, for logging. */
  source: 'config' | 'env' | 'dotenv-generated' | 'memory-generated'
}

/**
 * Resolve the HMAC signing secret used for proxy URL signing.
 *
 * Precedence:
 * 1. `scripts.security.secret` in nuxt.config
 * 2. `NUXT_SCRIPTS_PROXY_SECRET` env var
 * 3. Dev-only auto-generation: write to `.env` (or keep in memory as last resort)
 * 4. Empty string (prod without secret; caller decides whether this is fatal)
 */
export function resolveProxySecret(
  rootDir: string,
  isDev: boolean,
  configSecret?: string,
  autoGenerate: boolean = true,
): ResolvedProxySecret | undefined {
  if (configSecret)
    return { secret: configSecret, ephemeral: false, source: 'config' }

  const envSecret = process.env[PROXY_SECRET_ENV_KEY]
  if (envSecret)
    return { secret: envSecret, ephemeral: false, source: 'env' }

  if (!isDev || !autoGenerate)
    return undefined

  // Dev fallback: generate a 32-byte hex secret and try to persist to .env.
  // Persisting matters because the same dev machine restarts many times and
  // we don't want signed URLs cached in the browser to stop working across HMR.
  const secret = randomBytes(32).toString('hex')
  const envPath = resolvePath_(rootDir, '.env')
  const line = `${PROXY_SECRET_ENV_KEY}=${secret}\n`

  try {
    if (existsSync(envPath)) {
      const contents = readFileSync(envPath, 'utf-8')
      // Safety: don't append if another process already wrote one between the read above
      // and this branch. The regex check is cheap and idempotent.
      if (PROXY_SECRET_ENV_LINE_RE.test(contents)) {
        // Another instance already wrote it. Re-read and return that value.
        const match = contents.match(PROXY_SECRET_ENV_VALUE_RE)
        if (match?.[1])
          return { secret: match[1].trim(), ephemeral: false, source: 'dotenv-generated' }
      }
      appendFileSync(envPath, contents.endsWith('\n') ? line : `\n${line}`)
    }
    else {
      writeFileSync(envPath, `# Generated by @nuxt/scripts\n${line}`)
    }
    // Also populate process.env so that anything reading it later in the same
    // dev process (e.g. child workers) sees the value without a restart.
    process.env[PROXY_SECRET_ENV_KEY] = secret
    return { secret, ephemeral: false, source: 'dotenv-generated' }
  }
  catch {
    // Writing .env failed (read-only FS, permission denied). Fall back to
    // in-memory only; URLs signed this session won't verify after restart.
    process.env[PROXY_SECRET_ENV_KEY] = secret
    return { secret, ephemeral: true, source: 'memory-generated' }
  }
}

export function isProxyDisabled(
  registryKey: string,
  registry?: NuxtConfigScriptRegistry,
  runtimeConfig?: Record<string, any>,
): boolean {
  const entry = registry?.[registryKey] as NormalizedRegistryEntry | undefined
  if (!entry)
    return true
  const [input, scriptOptions] = entry
  if (input?.proxy === false || scriptOptions?.proxy === false)
    return true
  if (runtimeConfig) {
    const rtEntry = (runtimeConfig.public?.scripts as Record<string, any> | undefined)?.[registryKey]
    if (rtEntry?.proxy === false)
      return true
  }
  return false
}

export function applyAutoInject(
  registry: NuxtConfigScriptRegistry,
  runtimeConfig: Record<string, any>,
  proxyPrefix: string,
  registryKey: string,
  autoInject: ResolvedProxyAutoInject,
): void {
  if (isProxyDisabled(registryKey, registry, runtimeConfig))
    return

  const entry = registry[registryKey] as NormalizedRegistryEntry
  const input = entry[0]

  const rtScripts = runtimeConfig.public?.scripts as Record<string, any> | undefined
  const rtEntry = rtScripts?.[registryKey]

  const config = (rtEntry && typeof rtEntry === 'object') ? rtEntry : input
  if (!config || config[autoInject.configField])
    return

  const value = autoInject.computeValue(proxyPrefix, config)
  input[autoInject.configField] = value

  if (rtEntry && typeof rtEntry === 'object' && rtEntry !== input)
    rtEntry[autoInject.configField] = value
}

export interface ModuleOptions {
  /**
   * Base path prefix for all script endpoints (proxy and bundled assets).
   *
   * Proxy endpoints are served at `<prefix>/p/**` and bundled assets at `<prefix>/assets/**`.
   *
   * @default '/_scripts'
   * @example '/_tracking'
   */
  prefix?: string
  /**
   * Global privacy override for all proxied scripts.
   *
   * By default (`undefined`), each script uses its own privacy controls from the registry.
   * - `true`: full anonymization (IP, UA, language, screen, timezone, hardware)
   * - `false`: passthrough (still strips sensitive auth headers)
   * - `{ ip: true }`: selective override per flag
   *
   * @default undefined (per-script defaults)
   */
  privacy?: FirstPartyPrivacy
  /**
   * The registry of supported third-party scripts. Presence enables infrastructure (proxy routes, types, bundling, composable auto-imports).
   * Scripts only auto-load globally when `trigger` is explicitly set in the config object.
   */
  registry?: NuxtConfigScriptRegistry
  /**
   * Default options for scripts.
   */
  defaultScriptOptions?: NuxtUseScriptOptionsSerializable
  /**
   * Register scripts that should be loaded globally on all pages.
   */
  globals?: Record<string, NuxtUseScriptInput | [NuxtUseScriptInput, NuxtUseScriptOptionsSerializable]>
  /** Configure the way scripts assets are exposed */
  assets?: {
    /**
     * Scripts assets are exposed as public assets as part of the build.
     *
     * TODO Make configurable in future.
     */
    strategy?: 'public'
    /**
     * Fallback to src if bundle fails to load.
     * The default behavior is to stop the bundling process if a script fails to be downloaded.
     * @default false
     */
    fallbackOnSrcOnBundleFail?: boolean
    /**
     * Configure the fetch options used for downloading scripts.
     */
    fetchOptions?: FetchOptions
    /**
     * Cache duration for bundled scripts in milliseconds.
     * Scripts older than this will be re-downloaded during builds.
     * @default 604800000 (7 days)
     */
    cacheMaxAge?: number
    /**
     * Enable automatic integrity hash generation for bundled scripts.
     * When enabled, calculates SRI (Subresource Integrity) hash and injects
     * integrity attribute along with crossorigin="anonymous".
     *
     * @default false
     */
    integrity?: boolean | 'sha256' | 'sha384' | 'sha512'
  }
  /**
   * Proxy endpoint security.
   *
   * Several proxy endpoints (Google Static Maps, Geocode, Gravatar, embed image proxies)
   * inject server-side API keys or forward requests to third-party services. Without
   * signing, these are open to cost/quota abuse. Enable signing to require that only
   * URLs generated server-side (during SSR/prerender, or via `/_scripts/sign`) are
   * accepted.
   *
   * The secret must be deterministic across deployments so that prerendered URLs
   * remain valid. Set it via `NUXT_SCRIPTS_PROXY_SECRET` or `security.secret`.
   */
  security?: {
    /**
     * HMAC secret used to sign proxy URLs.
     *
     * Falls back to `process.env.NUXT_SCRIPTS_PROXY_SECRET` if unset. In dev,
     * the module auto-generates a secret into your `.env` file when neither is
     * provided (disable via `autoGenerateSecret: false`). In production, a
     * missing secret logs a warning; proxy endpoints remain functional but unprotected.
     *
     * Generate one with: `npx @nuxt/scripts generate-secret`
     */
    secret?: string
    /**
     * Automatically generate and persist a signing secret to `.env` when running
     * `nuxt dev` without one configured.
     *
     * @default true
     */
    autoGenerateSecret?: boolean
  }
  /**
   * Google Static Maps proxy configuration.
   * Proxies static map images through your server to fix CORS issues and enable caching.
   */
  googleStaticMapsProxy?: {
    /**
     * Enable proxying Google Static Maps through your own origin.
     * @default false
     */
    enabled?: boolean
    /**
     * Cache duration for static map images in seconds.
     * @default 3600 (1 hour)
     */
    cacheMaxAge?: number
  }
  /**
   * Enable standalone devtools mode.
   * When enabled, exposes a dev-only API endpoint that bridges script state
   * between the running Nuxt app and a standalone devtools UI.
   * This allows opening the devtools in a separate browser tab and connecting
   * to the dev server without the Nuxt DevTools iframe.
   *
   * @default false
   */
  /** @internal */
  _standaloneDevtools?: boolean
  /**
   * Whether the module is enabled.
   *
   * @default true
   */
  enabled: boolean
  /**
   * Enables debug mode.
   *
   * @false false
   */
  debug: boolean
}

export interface ModuleHooks {
  'scripts:registry': (registry: RegistryScripts) => void | Promise<void>
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxt/scripts',
    configKey: 'scripts',
    compatibility: {
      nuxt: '>=3.16',
    },
  },
  defaults: {
    defaultScriptOptions: {
      trigger: 'onNuxtReady',
    },
    assets: {
      fetchOptions: {
        retry: 3, // Specifies the number of retry attempts for failed fetches.
        retryDelay: 2000, // Specifies the delay (in milliseconds) between retry attempts.
        timeout: 15_000, // Configures the maximum time (in milliseconds) allowed for each fetch attempt.
      },
    },
    googleStaticMapsProxy: {
      enabled: false,
      cacheMaxAge: 3600,
    },
    enabled: true,
    debug: false,
  },
  async setup(config, nuxt) {
    const { resolve: resolveModule, resolvePath } = createResolver(import.meta.url)
    const { version, name } = await readPackageJSON(await resolvePath('../package.json'))
    nuxt.options.alias['#nuxt-scripts'] = await resolvePath('./runtime')
    logger.level = (config.debug || nuxt.options.debug) ? 4 : 3
    if (!config.enabled) {
      // TODO fallback to useHead?
      logger.debug('The module is disabled, skipping setup.')
      return
    }
    if (nuxt.options.dev) {
      setupDevtools(nuxt, { standalone: config._standaloneDevtools })
      if (config._standaloneDevtools) {
        const bridgePath = resolveModule('./runtime/devtools-standalone-bridge.client')
        addPluginTemplate({
          filename: 'modules/nuxt-scripts/devtools-standalone-bridge.client.mjs',
          getContents() {
            return `export { default } from '${bridgePath}'`
          },
        })
      }
    }
    // couldn't be found for some reason, assume compatibility
    const { version: unheadVersion } = await readPackageJSON('@unhead/vue', {
      from: nuxt.options.modulesDir,
    }).catch(() => ({ version: null }))
    if (unheadVersion?.startsWith('1')) {
      logger.error(`Nuxt Scripts requires Unhead >= 2, you are using v${unheadVersion}. Please run \`nuxi upgrade --clean\` to upgrade...`)
    }
    const scripts = await registry(resolvePath) as (RegistryScript & { _importRegistered?: boolean })[]

    // Normalize registry entries to [input, scriptOptions?] tuple form
    // Eliminates 4-shape polymorphism (true | 'mock' | object | array) for all downstream consumers
    if (config.registry) {
      migrateDeprecatedRegistryKeys(config.registry as Record<string, any>, msg => logger.warn(msg))
      normalizeRegistryConfig(config.registry as Record<string, any>, msg => logger.warn(msg))
      nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {}

      // Auto-populate env var defaults for enabled registry scripts so that
      // NUXT_PUBLIC_SCRIPTS_<SCRIPT>_<KEY> works without manual runtimeConfig.
      // Nuxt resolves env vars against runtimeConfig before modules run, so if the
      // user didn't declare the path, env vars are silently dropped. We read
      // process.env directly to recover them.
      const registryWithDefaults: Record<string, any> = {}
      for (const [key, entry] of Object.entries(config.registry)) {
        if (entry === false)
          continue
        const input = (entry as any[])[0]
        const scriptOptions = (entry as any[])[1]
        const envDefaults = scripts.find(s => s.registryKey === key)?.envDefaults
        const base: Record<string, any> = {}
        if (!envDefaults || !Object.keys(envDefaults).length) {
          Object.assign(base, input)
        }
        else {
          // Read process.env for each field, falling back to the static default
          const envResolved: Record<string, string> = {}
          for (const [field, defaultValue] of Object.entries(envDefaults)) {
            const envKey = `NUXT_PUBLIC_SCRIPTS_${toScreamingSnake(key)}_${toScreamingSnake(field)}`
            envResolved[field] = process.env[envKey] || defaultValue
          }
          Object.assign(base, defu(input, envResolved))
        }
        // Include scriptOptions so composable instances inherit registry-level settings (e.g. bundle)
        if (scriptOptions && Object.keys(scriptOptions).length > 0) {
          base.scriptOptions = scriptOptions
        }
        registryWithDefaults[key] = base
      }

      nuxt.options.runtimeConfig.public.scripts = defu(
        nuxt.options.runtimeConfig.public.scripts || {},
        registryWithDefaults,
      )
    }

    // Setup runtimeConfig for proxies and devtools.
    // Must run AFTER env var resolution above so the API key is populated.
    const googleMapsEnabled = config.googleStaticMapsProxy?.enabled || !!config.registry?.googleMaps
    nuxt.options.runtimeConfig['nuxt-scripts'] = {
      version: version!,
      // Private proxy config with API key (server-side only)
      googleStaticMapsProxy: googleMapsEnabled
        ? { apiKey: (nuxt.options.runtimeConfig.public.scripts as any)?.googleMaps?.apiKey }
        : undefined,
    } as any
    nuxt.options.runtimeConfig.public['nuxt-scripts'] = {
      // expose for devtools
      version: nuxt.options.dev ? version : undefined,
      prefix: config.prefix || '/_scripts',
      defaultScriptOptions: config.defaultScriptOptions as any,
      // Only expose enabled and cacheMaxAge to client, not apiKey
      googleStaticMapsProxy: googleMapsEnabled
        ? { enabled: true, cacheMaxAge: config.googleStaticMapsProxy?.cacheMaxAge ?? 3600 }
        : undefined,
    } as any

    // Register proxy handler unconditionally. The handler rejects unknown domains
    // at runtime, so it's safe to register even when no scripts use proxy.
    const scriptsBase = config.prefix || '/_scripts'
    const proxyPrefix = `${scriptsBase}/p`
    const assetsPrefix = `${scriptsBase}/assets`
    const proxyConfigs: Partial<Record<RegistryScriptKey, ProxyConfig>> = {}

    const proxyHandlerPath = await resolvePath('./runtime/server/proxy-handler')
    addServerHandler({ route: `${proxyPrefix}/**`, handler: proxyHandlerPath })

    const composables = [
      'useScript',
      'useScriptEventPage',
      'useScriptTriggerConsent',
      'useScriptTriggerElement',
      'useScriptTriggerIdleTimeout',
      'useScriptTriggerInteraction',
      'useScriptTriggerServiceWorker',
    ]
    for (const composable of composables) {
      addImports({
        priority: 2,
        name: composable,
        as: composable,
        from: await resolvePath(`./runtime/composables/${composable}`),
      })
    }

    addComponentsDir({
      path: await resolvePath('./runtime/components'),
      pathPrefix: false,
    })

    // Fix #613: Self-closing <Script*> tags break Nuxt's definePageMeta extraction.
    // Nuxt's SFC_SCRIPT_RE regex uses case-insensitive matching, so <ScriptFoo /> is
    // matched as a <script> opening tag. Without a closing </ScriptFoo>, the regex
    // consumes the real </script> closing tag, losing definePageMeta. Expanding
    // self-closing Script* tags to <ScriptFoo></ScriptFoo> provides the closing tag
    // that the regex needs to scope its match correctly.
    fixSelfClosingScriptComponents(nuxt)

    addTemplate({
      filename: 'nuxt-scripts-trigger-resolver.mjs',
      getContents() {
        return templateTriggerResolver(config.defaultScriptOptions)
      },
    })

    logger.debug('[nuxt-scripts] Proxy prefix:', proxyPrefix)

    for (const script of scripts) {
      if (script.import?.name) {
        addImports({ priority: 2, ...script.import })
        script._importRegistered = true
      }
    }

    // Validate required fields using schemas from registry scripts
    if (config.registry) {
      for (const [key, entry] of Object.entries(config.registry)) {
        if (!entry)
          continue
        const [input, scriptOptions] = entry as [Record<string, any>, any?]
        if (scriptOptions?.skipValidation)
          continue
        const script = scripts.find(s => s.registryKey === key)
        if (!script?.schema)
          continue
        const requiredFields = extractRequiredFields(script.schema)
        const missing = requiredFields.filter(f => !input[f])
        if (missing.length) {
          logger.warn(`[nuxt-scripts] registry.${key}: missing required field${missing.length > 1 ? 's' : ''} ${missing.map(f => `'${f}'`).join(', ')}. The script infrastructure is registered but will not function without ${missing.length > 1 ? 'them' : 'it'}.`)
        }
        // Warn when a user provides input config but no explicit trigger.
        // In v0 all configured scripts auto-loaded; in v1 a trigger is required.
        // trigger: false is valid (explicit infrastructure-only).
        // Only warn for user-provided fields (skip env-var-only defaults).
        const envDefaultKeys = new Set(Object.keys(script.envDefaults || {}))
        const userProvidedFields = Object.keys(input).filter(f => !envDefaultKeys.has(f))
        if (userProvidedFields.length > 0 && (!scriptOptions || !('trigger' in scriptOptions))) {
          logger.warn(
            `[nuxt-scripts] registry.${key}: config provided without a \`trigger\`. `
            + `The script will not auto-load. Add \`trigger: 'onNuxtReady'\` to auto-load, or \`trigger: false\` for infrastructure only. `
            + `See https://scripts.nuxt.com/docs/migration-guide/v0-to-v1`,
          )
        }
      }
    }

    nuxt.hooks.hook('modules:done', async () => {
      const registryScripts = [...scripts]

      await nuxt.hooks.callHook('scripts:registry' as any, registryScripts)

      for (const script of registryScripts) {
        if (script.import?.name && !script._importRegistered) {
          addImports({ priority: 3, ...script.import })
        }
      }

      // compare the registryScripts to the original registry to find new scripts
      const registryScriptsWithImport = registryScripts.filter(i => !!i.import?.name) as Required<RegistryScript>[]
      const newScripts = registryScriptsWithImport.filter(i => !scripts.some(r => r.import?.name === i.import.name))

      registerTypeTemplates({ config, newScripts })

      if (Object.keys(config.globals || {}).length || Object.keys(config.registry || {}).length) {
        // create a virtual plugin
        addPluginTemplate({
          filename: `modules/${name!.replace('/', '-')}/plugin.mjs`,
          getContents() {
            return templatePlugin(config, registryScriptsWithImport)
          },
        })
      }
      const { renderedScript } = setupPublicAssetStrategy(assetsPrefix)

      // Build scriptByKey once, shared across capabilities resolution and proxy setup
      const scriptByKey = new Map<string, RegistryScript>()
      for (const script of registryScripts) {
        if (script.registryKey)
          scriptByKey.set(script.registryKey, script)
      }

      // Resolve capabilities for each configured script and auto-detect partytown scripts
      const partytownScripts = new Set<string>()

      let anyNeedsProxy = false
      const registryKeys = Object.keys(config.registry || {})
      for (const key of registryKeys) {
        const script = scriptByKey.get(key)
        if (!script)
          continue

        // Get per-script options from normalized [input, scriptOptions?] entries
        const entry = (config.registry as Record<string, any>)?.[key]
        const scriptOptions = entry?.[1] || {}
        const inputOptions = entry?.[0] || {}
        // Merge: scriptOptions takes priority over input-level overrides
        const mergedOverrides = { ...inputOptions, ...scriptOptions }

        const resolved = resolveCapabilities(script, mergedOverrides)

        if (resolved.proxy)
          anyNeedsProxy = true

        if (resolved.partytown) {
          partytownScripts.add(key)
          // Auto-configure @nuxtjs/partytown forwards
          const forwards = getPartytownForwards(script)
          if (forwards?.length && hasNuxtModule('@nuxtjs/partytown')) {
            const partytownConfig = (nuxt.options as any).partytown || {}
            const existingForwards = partytownConfig.forward || []
            const newForwards = [...new Set([...existingForwards, ...forwards])]
            ;(nuxt.options as any).partytown = { ...partytownConfig, forward: newForwards }
          }
          else if (!forwards?.length && import.meta.dev) {
            logger.warn(`[partytown] "${key}" has no known Partytown forwards configured. It may not work correctly or may require manual forward configuration.`)
          }
        }
      }

      // Finalize proxy setup: build configs, register intercept plugin, wire devtools
      if (anyNeedsProxy) {
        const builtConfigs = buildProxyConfigsFromRegistry(registryScripts, scriptByKey)
        Object.assign(proxyConfigs, builtConfigs)

        const domainPrivacy: Record<string, ProxyPrivacyInput> = {}
        const unsupportedScripts: string[] = []
        const unmatchedScripts: string[] = []
        let totalDomains = 0
        const devtoolsScripts: ProxyDevtoolsScript[] = []

        for (const key of registryKeys) {
          const script = scriptByKey.get(key)
          if (!script) {
            unmatchedScripts.push(key)
            continue
          }
          if (!script.proxy)
            continue
          if (isProxyDisabled(key, config.registry))
            continue

          const configKey = (typeof script.proxy === 'string' ? script.proxy : key) as RegistryScriptKey
          const proxyConfig = proxyConfigs[configKey]
          if (!proxyConfig) {
            unsupportedScripts.push(key)
            continue
          }

          // Per-script privacy override from user config (stays on input after normalization)
          const entry = (config.registry as Record<string, any>)?.[key]
          const inputPrivacy = entry?.[0]?.privacy

          for (const domain of proxyConfig.domains) {
            domainPrivacy[domain] = inputPrivacy ?? proxyConfig.privacy
            totalDomains++
          }

          if (proxyConfig.autoInject && config.registry)
            applyAutoInject(config.registry, nuxt.options.runtimeConfig, proxyPrefix, key, proxyConfig.autoInject)

          if (nuxt.options.dev)
            devtoolsScripts.push(buildDevtoolsEntry(key, script, configKey, proxyConfig))
        }

        if (unmatchedScripts.length) {
          logger.warn(
            `Proxy mode: could not find registry scripts for: ${unmatchedScripts.join(', ')}.\n`
            + 'These scripts will not have proxy routes registered.',
          )
        }
        if (unsupportedScripts.length && nuxt.options.dev) {
          logger.warn(
            `Proxy mode is enabled but these scripts don't support it yet: ${unsupportedScripts.join(', ')}.\n`
            + 'They will load directly from third-party servers.',
          )
        }

        // Register intercept plugin
        addPluginTemplate({
          filename: 'nuxt-scripts-intercept.client.mjs',
          getContents() { return generateInterceptPluginContents(proxyPrefix, { testMode: !!nuxt.options.test }) },
        })

        // Server-side proxy config
        nuxt.options.runtimeConfig['nuxt-scripts-proxy'] = {
          proxyPrefix,
          domainPrivacy,
          privacy: config.privacy,
        } as any

        const privacyLabel = config.privacy === undefined ? 'per-script' : typeof config.privacy === 'boolean' ? (config.privacy ? 'anonymize' : 'passthrough') : 'custom'

        if (totalDomains > 0 && nuxt.options.dev) {
          logger.success(`Proxy mode enabled for ${registryKeys.length} script(s), ${totalDomains} domain(s) proxied (privacy: ${privacyLabel})`)
        }

        // Warn for static presets
        const staticPresets = ['static', 'github-pages', 'cloudflare-pages-static', 'netlify-static', 'azure-static', 'firebase-static']
        const preset = process.env.NITRO_PRESET || ''
        if (staticPresets.includes(preset)) {
          logger.warn(
            `Proxy collection endpoints require a server runtime (detected: ${preset || 'static'}).\n`
            + 'Scripts will be bundled, but collection requests will not be proxied.\n'
            + 'Options: configure platform rewrites, switch to server-rendered mode, or disable with proxy: false.',
          )
        }

        // Expose devtools data
        if (nuxt.options.dev) {
          nuxt.options.runtimeConfig.public['nuxt-scripts-devtools'] = buildDevtoolsData(proxyPrefix, privacyLabel, devtoolsScripts) as any
        }

        // Auto-configure Partytown resolveUrl for proxy
        if (partytownScripts.size && hasNuxtModule('@nuxtjs/partytown')) {
          const partytownConfig = (nuxt.options as any).partytown || {}
          if (!partytownConfig.resolveUrl) {
            partytownConfig.resolveUrl = generatePartytownResolveUrl(proxyPrefix)
            ;(nuxt.options as any).partytown = partytownConfig
            logger.info('[partytown] Auto-configured resolveUrl for proxy')
          }
          else {
            logger.warn('[partytown] Custom resolveUrl already set. Add proxy rules to your resolveUrl manually.')
          }
        }
      }

      const moduleInstallPromises: Map<string, () => Promise<boolean> | undefined> = new Map()

      addBuildPlugin(NuxtScriptsCheckScripts(), {
        dev: true,
      })
      addBuildPlugin(NuxtScriptBundleTransformer({
        scripts: registryScriptsWithImport,
        registryConfig: nuxt.options.runtimeConfig.public.scripts as Record<string, any> | undefined,
        proxyConfigs,
        proxyPrefix,
        partytownScripts,
        moduleDetected(module) {
          if (nuxt.options.dev && module !== '@nuxt/scripts' && !moduleInstallPromises.has(module) && !hasNuxtModule(module))
            moduleInstallPromises.set(module, () => installNuxtModule(module))
        },
        assetsBaseURL: assetsPrefix,
        fallbackOnSrcOnBundleFail: config.assets?.fallbackOnSrcOnBundleFail,
        fetchOptions: config.assets?.fetchOptions,
        cacheMaxAge: config.assets?.cacheMaxAge,
        integrity: config.assets?.integrity,
        renderedScript,
      }))

      nuxt.hooks.hook('build:done', async () => {
        const initPromise = [...moduleInstallPromises.values()]
        for (const p of initPromise)
          await p?.()
      })
    })

    // Register server handlers for enabled registry scripts
    const scriptsPrefix = config.prefix || '/_scripts'
    const enabledEndpoints: Record<string, boolean> = {}
    let anyHandlerRequiresSigning = false
    for (const script of scripts) {
      if (!script.serverHandlers?.length || !script.registryKey)
        continue

      // googleMaps uses googleStaticMapsProxy config for backward compat
      const isEnabled = script.registryKey === 'googleMaps'
        ? config.googleStaticMapsProxy?.enabled || config.registry?.googleMaps
        : config.registry?.[script.registryKey as keyof typeof config.registry]

      if (!isEnabled)
        continue

      enabledEndpoints[script.registryKey] = true
      for (const handler of script.serverHandlers) {
        const resolvedRoute = handler.route.replace('/_scripts', scriptsPrefix)
        addServerHandler({
          route: resolvedRoute,
          handler: handler.handler,
          middleware: handler.middleware,
        })
        if (handler.requiresSigning)
          anyHandlerRequiresSigning = true
      }

      // Script-specific runtimeConfig setup
      if (script.registryKey === 'gravatar') {
        // After normalization, all entries are [input, scriptOptions?]
        const gravatarConfig = (config.registry?.gravatar as any[])?.[0] || {}
        nuxt.options.runtimeConfig.public['nuxt-scripts'] = defu(
          { gravatarProxy: { cacheMaxAge: gravatarConfig.cacheMaxAge ?? 3600 } },
          nuxt.options.runtimeConfig.public['nuxt-scripts'] as any,
        ) as any
      }
      if (script.registryKey === 'googleMaps') {
        nuxt.options.runtimeConfig['nuxt-scripts'] = defu(
          { googleMapsGeocodeProxy: { apiKey: (nuxt.options.runtimeConfig.public.scripts as any)?.googleMaps?.apiKey } },
          nuxt.options.runtimeConfig['nuxt-scripts'] as any,
        ) as any
      }
    }

    // Publish enabled endpoints to client for component opt-in checks
    nuxt.options.runtimeConfig.public['nuxt-scripts'] = defu(
      { endpoints: enabledEndpoints },
      nuxt.options.runtimeConfig.public['nuxt-scripts'] as any,
    ) as any

    // Resolve the HMAC signing secret only when at least one handler needs it.
    // This avoids writing NUXT_SCRIPTS_PROXY_SECRET to .env for users who only
    // use client-side scripts (analytics, tracking) with no proxy endpoints.
    if (anyHandlerRequiresSigning) {
      const proxySecretResolved = resolveProxySecret(
        nuxt.options.rootDir,
        !!nuxt.options.dev,
        config.security?.secret,
        config.security?.autoGenerateSecret !== false,
      )
      if (proxySecretResolved?.source === 'dotenv-generated')
        logger.info(`[security] Generated ${PROXY_SECRET_ENV_KEY} in .env for signed proxy URLs.`)
      else if (proxySecretResolved?.source === 'memory-generated')
        logger.warn(`[security] Generated an in-memory ${PROXY_SECRET_ENV_KEY} (could not write .env). Signed URLs will break across restarts.`)

      if (proxySecretResolved?.secret) {
        nuxt.options.runtimeConfig['nuxt-scripts'] = defu(
          { proxySecret: proxySecretResolved.secret },
          nuxt.options.runtimeConfig['nuxt-scripts'] as any,
        ) as any
      }
      else if (!nuxt.options.dev) {
        // Warn (not throw) so that nuxt prepare, nuxt build, and CI work without
        // the secret. withSigning passes through when no secret is configured, so
        // endpoints remain functional but unsigned. Users opt in to enforcement by
        // setting the env var.
        logger.warn(
          `[security] ${PROXY_SECRET_ENV_KEY} is not set. Proxy endpoints are unprotected.\n`
          + '  Generate one with: npx @nuxt/scripts generate-secret\n'
          + `  Then set the env var: ${PROXY_SECRET_ENV_KEY}=<secret>`,
        )
      }
    }
  },
})
