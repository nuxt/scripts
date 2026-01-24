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

/**
 * Partytown forward config for registry scripts.
 * Scripts not listed here are likely incompatible due to DOM access requirements.
 * @see https://partytown.qwik.dev/forwarding-events
 */
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
    nuxt.options.runtimeConfig['nuxt-scripts'] = {
      version: version!,
      // Private proxy config with API key (server-side only)
      googleStaticMapsProxy: config.googleStaticMapsProxy?.enabled
        ? { apiKey: (nuxt.options.runtimeConfig.public.scripts as any)?.googleMaps?.apiKey }
        : undefined,
    }
    nuxt.options.runtimeConfig.public['nuxt-scripts'] = {
      // expose for devtools
      version: nuxt.options.dev ? version : undefined,
      defaultScriptOptions: config.defaultScriptOptions as any,
      // Only expose enabled and cacheMaxAge to client, not apiKey
      googleStaticMapsProxy: config.googleStaticMapsProxy?.enabled
        ? { enabled: true, cacheMaxAge: config.googleStaticMapsProxy.cacheMaxAge }
        : undefined,
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

        const existing = config.registry[scriptKey]
        if (Array.isArray(existing)) {
          // [input, options] format - merge partytown into options
          existing[1] = { ...existing[1], partytown: true }
        }
        else if (existing && typeof existing === 'object' && existing !== true && existing !== 'mock') {
          // input object format - wrap with partytown option
          config.registry[scriptKey] = [existing, { partytown: true }] as any
        }
        else if (existing === true || existing === 'mock') {
          // simple enable - convert to array with partytown
          config.registry[scriptKey] = [{}, { partytown: true }] as any
        }
        else {
          // not configured - add with partytown enabled
          config.registry[scriptKey] = [{}, { partytown: true }] as any
        }
      }

      // Auto-configure @nuxtjs/partytown forward array
      if (requiredForwards.length && hasNuxtModule('@nuxtjs/partytown')) {
        const partytownConfig = (nuxt.options as any).partytown || {}
        const existingForwards = partytownConfig.forward || []
        const newForwards = [...new Set([...existingForwards, ...requiredForwards])]
        ;(nuxt.options as any).partytown = { ...partytownConfig, forward: newForwards }
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

      const moduleInstallPromises: Map<string, () => Promise<boolean> | undefined> = new Map()

      addBuildPlugin(NuxtScriptsCheckScripts(), {
        dev: true,
      })
      addBuildPlugin(NuxtScriptBundleTransformer({
        scripts: registryScriptsWithImport,
        registryConfig: nuxt.options.runtimeConfig.public.scripts as Record<string, any> | undefined,
        defaultBundle: config.defaultScriptOptions?.bundle,
        moduleDetected(module) {
          if (nuxt.options.dev && module !== '@nuxt/scripts' && !moduleInstallPromises.has(module) && !hasNuxtModule(module))
            moduleInstallPromises.set(module, () => installNuxtModule(module))
        },
        assetsBaseURL: config.assets?.prefix,
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

    // Add Google Static Maps proxy handler if enabled
    if (config.googleStaticMapsProxy?.enabled) {
      addServerHandler({
        route: '/_scripts/google-static-maps-proxy',
        handler: await resolvePath('./runtime/server/google-static-maps-proxy'),
      })
    }

    // Add X/Twitter embed proxy handlers
    addServerHandler({
      route: '/api/_scripts/x-embed',
      handler: await resolvePath('./runtime/server/x-embed'),
    })
    addServerHandler({
      route: '/api/_scripts/x-embed-image',
      handler: await resolvePath('./runtime/server/x-embed-image'),
    })

    // Add Instagram embed proxy handlers
    addServerHandler({
      route: '/api/_scripts/instagram-embed',
      handler: await resolvePath('./runtime/server/instagram-embed'),
    })
    addServerHandler({
      route: '/api/_scripts/instagram-embed-image',
      handler: await resolvePath('./runtime/server/instagram-embed-image'),
    })
    addServerHandler({
      route: '/api/_scripts/instagram-embed-asset',
      handler: await resolvePath('./runtime/server/instagram-embed-asset'),
    })

    if (nuxt.options.dev)
      setupDevToolsUI(config, resolvePath)
  },
})
