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
import { readPackageJSON } from 'pkg-types'
import type { FetchOptions } from 'ofetch'
import { setupDevToolsUI } from './devtools'
import { NuxtScriptBundleTransformer } from './plugins/transform'
import { setupPublicAssetStrategy } from './assets'
import { logger } from './logger'
import { installNuxtModule } from './kit'
import { registry } from './registry'
import type {
  NuxtConfigScriptRegistry,
  NuxtUseScriptInput,
  NuxtUseScriptOptionsSerializable,
  RegistryScript,
  RegistryScripts,
} from './runtime/types'
import { NuxtScriptsCheckScripts } from './plugins/check-scripts'
import { registerTypeTemplates, templatePlugin, templateTriggerResolver } from './templates'
import { getAllProxyConfigs, type ProxyConfig } from './proxy-configs'

export interface FirstPartyOptions {
  /**
   * Path prefix for serving bundled scripts.
   *
   * This is where the downloaded and rewritten script files are served from.
   * @default '/_scripts'
   * @example '/_analytics'
   */
  prefix?: string
  /**
   * Path prefix for collection/tracking proxy endpoints.
   *
   * Analytics collection requests are proxied through these paths.
   * For example, Google Analytics collection goes to `/_scripts/c/ga/g/collect`.
   * @default '/_scripts/c'
   * @example '/_tracking'
   */
  collectPrefix?: string
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
    nuxt.options.runtimeConfig['nuxt-scripts'] = { version }
    nuxt.options.runtimeConfig.public['nuxt-scripts'] = {
      // expose for devtools
      version: nuxt.options.dev ? version : undefined,
      defaultScriptOptions: config.defaultScriptOptions,
    }

    // Merge registry config with existing runtimeConfig.public.scripts for proper env var resolution
    // Both scripts.registry and runtimeConfig.public.scripts should be supported
    if (config.registry) {
      // Ensure runtimeConfig.public exists
      nuxt.options.runtimeConfig.public = nuxt.options.runtimeConfig.public || {}

      nuxt.options.runtimeConfig.public.scripts = defu(
        nuxt.options.runtimeConfig.public.scripts || {},
        config.registry,
      )
    }

    // Handle deprecation of bundle option - migrate to firstParty
    if (config.defaultScriptOptions?.bundle !== undefined) {
      logger.warn(
        '`scripts.defaultScriptOptions.bundle` is deprecated. '
        + 'Use `scripts.firstParty: true` instead.',
      )
      // Migrate: treat bundle as firstParty
      if (!config.firstParty && config.defaultScriptOptions.bundle) {
        config.firstParty = true
      }
    }

    // Resolve first-party configuration
    const staticPresets = ['static', 'github-pages', 'cloudflare-pages-static']
    const preset = nuxt.options.nitro?.preset || process.env.NITRO_PRESET || ''
    const isStaticPreset = staticPresets.includes(preset)

    const firstPartyEnabled = !!config.firstParty
    const firstPartyPrefix = typeof config.firstParty === 'object' ? config.firstParty.prefix : undefined
    const firstPartyCollectPrefix = typeof config.firstParty === 'object'
      ? config.firstParty.collectPrefix || '/_scripts/c'
      : '/_scripts/c'
    const assetsPrefix = firstPartyPrefix || config.assets?.prefix || '/_scripts'

    const composables = [
      'useScript',
      'useScriptEventPage',
      'useScriptTriggerConsent',
      'useScriptTriggerElement',
      'useScriptTriggerIdleTimeout',
      'useScriptTriggerInteraction',
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

    addTemplate({
      filename: 'nuxt-scripts-trigger-resolver.mjs',
      getContents() {
        return templateTriggerResolver(config.defaultScriptOptions)
      },
    })

    const scripts = await registry(resolvePath) as (RegistryScript & { _importRegistered?: boolean })[]

    for (const script of scripts) {
      if (script.import?.name) {
        addImports({ priority: 2, ...script.import })
        script._importRegistered = true
      }
    }

    nuxt.hooks.hook('modules:done', async () => {
      const registryScripts = [...scripts]

      // @ts-expect-error nuxi prepare is broken to generate these types, possibly because of the runtime path
      await nuxt.hooks.callHook('scripts:registry', registryScripts)

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

      // Inject proxy route rules if first-party mode is enabled
      if (firstPartyEnabled) {
        const proxyConfigs = getAllProxyConfigs(firstPartyCollectPrefix)
        const registryKeys = Object.keys(config.registry || {})

        // Collect routes for all configured registry scripts that support proxying
        const neededRoutes: Record<string, { proxy: string }> = {}
        for (const key of registryKeys) {
          // Find the registry script definition
          const script = registryScriptsWithImport.find(s => s.import.name === `useScript${key.charAt(0).toUpperCase() + key.slice(1)}`)
          // Use script's proxy field if defined, otherwise fall back to registry key
          // If proxy is explicitly false, skip this script entirely
          const proxyKey = script?.proxy !== false ? (script?.proxy || key) : undefined
          if (proxyKey) {
            const proxyConfig = proxyConfigs[proxyKey]
            if (proxyConfig?.routes) {
              Object.assign(neededRoutes, proxyConfig.routes)
            }
          }
        }

        // Inject route rules
        if (Object.keys(neededRoutes).length) {
          nuxt.options.routeRules = {
            ...nuxt.options.routeRules,
            ...neededRoutes,
          }

          // Log active proxy routes in dev
          if (nuxt.options.dev) {
            const routeCount = Object.keys(neededRoutes).length
            const scriptsCount = registryKeys.length
            logger.success(`First-party mode enabled for ${scriptsCount} script(s), ${routeCount} proxy route(s) configured`)
            if (logger.level >= 4) {
              for (const [path, config] of Object.entries(neededRoutes)) {
                logger.debug(`  ${path} → ${config.proxy}`)
              }
            }
          }
        }

        // Expose first-party status via runtime config (for DevTools and status endpoint)
        const flatRoutes: Record<string, string> = {}
        for (const [path, config] of Object.entries(neededRoutes)) {
          flatRoutes[path] = config.proxy
        }
        nuxt.options.runtimeConfig.public['nuxt-scripts-status'] = {
          enabled: firstPartyEnabled,
          scripts: registryKeys,
          routes: flatRoutes,
          collectPrefix: firstPartyCollectPrefix,
        }

        // Warn for static presets with actionable guidance
        if (isStaticPreset) {
          logger.warn(
            `First-party collection endpoints require a server runtime (detected: ${preset || 'static'}).\n`
            + 'Scripts will be bundled, but collection requests will not be proxied.\n'
            + '\n'
            + 'Options:\n'
            + '  1. Configure platform rewrites (Vercel, Netlify, Cloudflare)\n'
            + '  2. Switch to server-rendered mode (ssr: true)\n'
            + '  3. Disable with firstParty: false\n'
            + '\n'
            + 'See: https://scripts.nuxt.com/docs/guides/first-party#static-hosting',
          )
        }
      }

      const moduleInstallPromises: Map<string, () => Promise<boolean> | undefined> = new Map()

      addBuildPlugin(NuxtScriptsCheckScripts(), {
        dev: true,
      })
      addBuildPlugin(NuxtScriptBundleTransformer({
        scripts: registryScriptsWithImport,
        registryConfig: nuxt.options.runtimeConfig.public.scripts as Record<string, any> | undefined,
        defaultBundle: firstPartyEnabled || config.defaultScriptOptions?.bundle,
        firstPartyEnabled,
        firstPartyCollectPrefix,
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
        const initPromise = Array.from(moduleInstallPromises.values())
        for (const p of initPromise)
          await p?.()
      })
    })

    if (nuxt.options.dev) {
      setupDevToolsUI(config, resolvePath)

      // Add status and health endpoints in dev mode
      addServerHandler({
        route: '/_scripts/status.json',
        handler: await resolvePath('./runtime/server/api/scripts-status'),
      })
      addServerHandler({
        route: '/_scripts/health.json',
        handler: await resolvePath('./runtime/server/api/scripts-health'),
      })
    }
  },
})
