import type { FetchOptions } from 'ofetch'
import type { FirstPartyOptions, FirstPartyPrivacy, InterceptRule } from './first-party'
import type {
  NuxtConfigScriptRegistry,
  NuxtUseScriptInput,
  NuxtUseScriptOptionsSerializable,
  RegistryScript,
  RegistryScripts,
} from './runtime/types'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
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
import { setupDevToolsUI } from './devtools'
import { finalizeFirstParty, resolveFirstPartyConfig, setupFirstPartyHandlers } from './first-party'
import { installNuxtModule } from './kit'
import { logger } from './logger'
import { NuxtScriptsCheckScripts } from './plugins/check-scripts'
import { NuxtScriptBundleTransformer } from './plugins/transform'
import { registry } from './registry'
import { registerTypeTemplates, templatePlugin, templateTriggerResolver } from './templates'

declare module '@nuxt/schema' {
  interface NuxtHooks {
    'scripts:registry': (registry: RegistryScripts) => void | Promise<void>
  }
}

export type { FirstPartyOptions, FirstPartyPrivacy }

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

const REGISTRY_ENV_DEFAULTS: Record<string, Record<string, string>> = {
  clarity: { id: '' },
  cloudflareWebAnalytics: { token: '' },
  crisp: { id: '' },
  databuddyAnalytics: { clientId: '' },
  fathomAnalytics: { site: '' },
  googleAdsense: { client: '' },
  googleAnalytics: { id: '' },
  googleMaps: { apiKey: '' },
  googleRecaptcha: { siteKey: '' },
  googleSignIn: { clientId: '' },
  googleTagManager: { id: '' },
  hotjar: { id: '' },
  intercom: { app_id: '' },
  matomoAnalytics: { matomoUrl: '' },
  metaPixel: { id: '' },
  paypal: { clientId: '' },
  plausibleAnalytics: { domain: '' },
  posthog: { apiKey: '' },
  redditPixel: { id: '' },
  rybbitAnalytics: { siteId: '' },
  segment: { writeKey: '' },
  snapchatPixel: { id: '' },
  stripe: {},
  tiktokPixel: { id: '' },
  umamiAnalytics: { websiteId: '' },
  vercelAnalytics: {},
  xPixel: { id: '' },
}

const PARTYTOWN_FORWARDS: Record<string, string[]> = {
  googleAnalytics: ['dataLayer.push', 'gtag'],
  plausible: ['plausible'],
  fathom: ['fathom', 'fathom.trackEvent', 'fathom.trackPageview'],
  umami: ['umami', 'umami.track'],
  matomo: ['_paq.push'],
  segment: ['analytics', 'analytics.track', 'analytics.page', 'analytics.identify'],
  metaPixel: ['fbq'],
  xPixel: ['twq'],
  tiktokPixel: ['ttq.track', 'ttq.page', 'ttq.identify'],
  snapchatPixel: ['snaptr'],
  redditPixel: ['rdt'],
  cloudflareWebAnalytics: ['__cfBeacon'],
}

export interface ModuleOptions {
  /**
   * Route third-party scripts through your domain for improved privacy.
   *
   * When enabled, scripts are downloaded at build time and served from your domain.
   * Collection endpoints (analytics, pixels) are also routed through your server,
   * keeping user IPs private and eliminating third-party cookies.
   *
   * **Benefits:**
   * - User IPs stay private (third parties see your server's IP)
   * - No third-party cookies (requests are same-origin)
   * - Works with ad blockers (requests appear first-party)
   * - Faster loads (no extra DNS lookups)
   *
   * **Options:**
   * - `true` - Enable for all supported scripts (default)
   * - `false` - Disable (scripts load directly from third parties)
   * - `{ collectPrefix: '/_analytics' }` - Enable with custom paths
   *
   * For static hosting, scripts are bundled but proxy endpoints require
   * platform rewrites (see docs). A warning is shown for static presets.
   *
   * @default true
   * @see https://scripts.nuxt.com/docs/guides/first-party
   */
  firstParty?: boolean | FirstPartyOptions
  /**
   * The registry of supported third-party scripts. Loads the scripts in globally using the default script options.
   */
  registry?: NuxtConfigScriptRegistry
  /**
   * Registry scripts to load via Partytown (web worker).
   * Shorthand for setting `partytown: true` on individual registry scripts.
   * @example ['googleAnalytics', 'plausible', 'fathom']
   */
  partytown?: (keyof NuxtConfigScriptRegistry)[]
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
     * The baseURL where scripts files are served.
     * @default '/_scripts/'
     */
    prefix?: string
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
    firstParty: true,
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
    const { resolvePath } = createResolver(import.meta.url)
    const { version, name } = await readPackageJSON(await resolvePath('../package.json'))
    nuxt.options.alias['#nuxt-scripts-validator'] = await resolvePath(`./runtime/validation/${(nuxt.options.dev || nuxt.options._prepare) ? 'valibot' : 'mock'}`)
    nuxt.options.alias['#nuxt-scripts'] = await resolvePath('./runtime')
    logger.level = (config.debug || nuxt.options.debug) ? 4 : 3
    if (!config.enabled) {
      // TODO fallback to useHead?
      logger.debug('The module is disabled, skipping setup.')
      return
    }
    // couldn't be found for some reason, assume compatibility
    const { version: unheadVersion } = await readPackageJSON('@unhead/vue', {
      from: nuxt.options.modulesDir,
    }).catch(() => ({ version: null }))
    if (unheadVersion?.startsWith('1')) {
      logger.error(`Nuxt Scripts requires Unhead >= 2, you are using v${unheadVersion}. Please run \`nuxi upgrade --clean\` to upgrade...`)
    }
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
      defaultScriptOptions: config.defaultScriptOptions as any,
      // Only expose enabled and cacheMaxAge to client, not apiKey
      googleStaticMapsProxy: googleMapsEnabled
        ? { enabled: true, cacheMaxAge: config.googleStaticMapsProxy?.cacheMaxAge ?? 3600 }
        : undefined,
    } as any

    // Merge registry config with existing runtimeConfig.public.scripts for proper env var resolution
    // Both scripts.registry and runtimeConfig.public.scripts should be supported
    if (config.registry) {
      nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {}

      // Auto-populate env var defaults for enabled registry scripts so that
      // NUXT_PUBLIC_SCRIPTS_<SCRIPT>_<KEY> works without manual runtimeConfig
      const registryWithDefaults: Record<string, any> = {}
      for (const [key, value] of Object.entries(config.registry)) {
        if (value && REGISTRY_ENV_DEFAULTS[key]) {
          const envDefaults = REGISTRY_ENV_DEFAULTS[key]
          if (value === true || value === 'mock') {
            registryWithDefaults[key] = { ...envDefaults }
          }
          else if (typeof value === 'object' && !Array.isArray(value)) {
            registryWithDefaults[key] = defu(value, envDefaults)
          }
          else if (Array.isArray(value)) {
            registryWithDefaults[key] = defu(value[0] || {}, envDefaults)
          }
          else {
            registryWithDefaults[key] = value
          }
        }
        else {
          registryWithDefaults[key] = value
        }
      }

      nuxt.options.runtimeConfig.public.scripts = defu(
        nuxt.options.runtimeConfig.public.scripts || {},
        registryWithDefaults,
      )
    }

    // Handle deprecation of bundle option
    if (config.defaultScriptOptions?.bundle !== undefined) {
      logger.warn(
        '`scripts.defaultScriptOptions.bundle` is deprecated. '
        + 'Use `scripts.firstParty: true` instead. First-party mode is now enabled by default.',
      )
    }

    // Resolve first-party configuration
    const firstParty = resolveFirstPartyConfig(config)
    const assetsPrefix = firstParty.assetsPrefix

    // Process partytown shorthand - add partytown: true to specified registry scripts
    // and auto-configure @nuxtjs/partytown forward array
    if (config.partytown?.length) {
      config.registry = config.registry || {}
      const requiredForwards: string[] = []

      for (const scriptKey of config.partytown) {
        // Collect required forwards for this script
        const forwards = PARTYTOWN_FORWARDS[scriptKey]
        if (forwards) {
          requiredForwards.push(...forwards)
        }
        else if (import.meta.dev) {
          logger.warn(`[partytown] "${scriptKey}" has no known Partytown forwards configured. It may not work correctly or may require manual forward configuration.`)
        }

        const reg = config.registry as Record<string, any>
        const existing = reg[scriptKey]
        if (Array.isArray(existing)) {
          // [input, options] format - merge partytown into options
          existing[1] = { ...existing[1], partytown: true }
        }
        else if (existing && typeof existing === 'object' && existing !== true && existing !== 'mock') {
          // input object format - wrap with partytown option
          reg[scriptKey] = [existing, { partytown: true }]
        }
        else if (existing === true || existing === 'mock') {
          // simple enable - convert to array with partytown
          reg[scriptKey] = [{}, { partytown: true }]
        }
        else {
          // not configured - add with partytown enabled
          reg[scriptKey] = [{}, { partytown: true }]
        }
      }

      // Auto-configure @nuxtjs/partytown forward array
      if (requiredForwards.length && hasNuxtModule('@nuxtjs/partytown')) {
        const partytownConfig = (nuxt.options as any).partytown || {}
        const existingForwards = partytownConfig.forward || []
        const newForwards = [...new Set([...existingForwards, ...requiredForwards])]
          ; (nuxt.options as any).partytown = { ...partytownConfig, forward: newForwards }
        logger.info(`[partytown] Auto-configured forwards: ${requiredForwards.join(', ')}`)
      }
    }

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

    logger.debug('[nuxt-scripts] First-party config:', firstParty)

    // Setup first-party proxy mode (must be before modules:done)
    let interceptRules: InterceptRule[] = []
    if (firstParty.enabled) {
      interceptRules = await setupFirstPartyHandlers(firstParty, resolvePath)
    }

    const scripts = await registry(resolvePath) as (RegistryScript & { _importRegistered?: boolean })[]

    for (const script of scripts) {
      if (script.import?.name) {
        addImports({ priority: 2, ...script.import })
        script._importRegistered = true
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

      registerTypeTemplates({ nuxt, config, newScripts })

      if (Object.keys(config.globals || {}).length || Object.keys(config.registry || {}).length) {
        // create a virtual plugin
        addPluginTemplate({
          filename: `modules/${name!.replace('/', '-')}/plugin.mjs`,
          getContents() {
            return templatePlugin(config, registryScriptsWithImport)
          },
        })
      }
      const { renderedScript } = setupPublicAssetStrategy(config.assets)

      // Finalize first-party proxy setup
      if (firstParty.enabled) {
        finalizeFirstParty({
          firstParty,
          interceptRules,
          registry: config.registry,
          registryScripts,
          registryScriptsWithImport,
          nuxtOptions: nuxt.options,
        })
      }

      const moduleInstallPromises: Map<string, () => Promise<boolean> | undefined> = new Map()

      addBuildPlugin(NuxtScriptsCheckScripts(), {
        dev: true,
      })
      addBuildPlugin(NuxtScriptBundleTransformer({
        scripts: registryScriptsWithImport,
        registryConfig: nuxt.options.runtimeConfig.public.scripts as Record<string, any> | undefined,
        defaultBundle: firstParty.enabled || config.defaultScriptOptions?.bundle,
        firstPartyEnabled: firstParty.enabled,
        firstPartyCollectPrefix: firstParty.collectPrefix,
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
    const enabledEndpoints: Record<string, boolean> = {}
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
        addServerHandler({
          route: handler.route,
          handler: handler.handler,
          middleware: handler.middleware,
        })
      }

      // Script-specific runtimeConfig setup
      if (script.registryKey === 'gravatar') {
        const gravatarConfig = typeof config.registry?.gravatar === 'object' && !Array.isArray(config.registry.gravatar)
          ? config.registry.gravatar as Record<string, any>
          : {}
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

    if (nuxt.options.dev) {
      setupDevToolsUI(config, resolvePath)
    }
  },
})
