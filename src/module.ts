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
import { readFileSync } from 'node:fs'
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
import { getAllProxyConfigs, getSWInterceptRules } from './proxy-configs'

/**
 * Privacy mode for first-party proxy requests.
 *
 * - `'anonymize'` (default) - Prevents fingerprinting: anonymizes IP addresses to country-level,
 *   normalizes device info and canvas data. All other data passes through unchanged.
 *
 * - `'proxy'` - No modification: forwards all headers and data as-is. Privacy comes from
 *   routing requests through your server (third parties see server IP, not user IP).
 */
export type FirstPartyPrivacy = 'proxy' | 'anonymize'

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
   * @default '/_proxy'
   * @example '/_tracking'
   */
  collectPrefix?: string
  /**
   * Privacy level for proxied requests.
   *
   * Controls what user information is forwarded to third-party analytics services.
   *
   * - `'anonymize'` - Prevents fingerprinting by anonymizing IPs and device info (default)
   * - `'proxy'` - No modification, just routes through your server
   *
   * @default 'anonymize'
   */
  privacy?: FirstPartyPrivacy
}

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
    nuxt.options.runtimeConfig['nuxt-scripts'] = {
      version: version!,
      // Private proxy config with API key (server-side only)
      googleStaticMapsProxy: config.googleStaticMapsProxy?.enabled
        ? { apiKey: (nuxt.options.runtimeConfig.public.scripts as any)?.googleMaps?.apiKey }
        : undefined,
      swTemplate: readFileSync(await resolvePath('./runtime/sw/proxy-sw.template.js'), 'utf-8'),
    } as any
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

    // Handle deprecation of bundle option
    if (config.defaultScriptOptions?.bundle !== undefined) {
      logger.warn(
        '`scripts.defaultScriptOptions.bundle` is deprecated. '
        + 'Use `scripts.firstParty: true` instead. First-party mode is now enabled by default.',
      )
    }

    // Resolve first-party configuration
    const staticPresets = ['static', 'github-pages', 'cloudflare-pages-static']
    const preset = nuxt.options.nitro?.preset || process.env.NITRO_PRESET || ''
    const isStaticPreset = staticPresets.includes(preset)

    const firstPartyEnabled = !!config.firstParty
    const firstPartyPrefix = typeof config.firstParty === 'object' ? config.firstParty.prefix : undefined
    const firstPartyCollectPrefix = typeof config.firstParty === 'object'
      ? config.firstParty.collectPrefix || '/_proxy'
      : '/_proxy'
    const firstPartyPrivacy = typeof config.firstParty === 'object'
      ? config.firstParty.privacy ?? 'anonymize'
      : 'anonymize'
    const assetsPrefix = firstPartyPrefix || config.assets?.prefix || '/_scripts'

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

    addTemplate({
      filename: 'nuxt-scripts-trigger-resolver.mjs',
      getContents() {
        return templateTriggerResolver(config.defaultScriptOptions)
      },
    })

    // Pre-resolve paths needed for hooks
    const swHandlerPath = await resolvePath('./runtime/server/sw-handler')

    logger.debug('[nuxt-scripts] First-party config:', { firstPartyEnabled, firstPartyPrivacy, firstPartyCollectPrefix })

    // Setup Service Worker for first-party mode (must be before modules:done)
    if (firstPartyEnabled) {
      // Use root path to avoid conflict with /_scripts/** wildcard route
      const swPath = '/_nuxt-scripts-sw.js'
      const swRules = getSWInterceptRules(firstPartyCollectPrefix)

      // Serve SW from the scripts prefix
      addServerHandler({
        route: swPath,
        handler: swHandlerPath,
      })

      // Register the SW registration plugin
      addPluginTemplate({
        filename: 'nuxt-scripts-sw-register.client.mjs',
        getContents() {
          return `import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin({
  name: 'nuxt-scripts:sw-register',
  enforce: 'pre',
  async setup() {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register('${swPath}', { scope: '/' });

      // Wait for SW to be active and controlling this page
      if (!navigator.serviceWorker.controller) {
        await new Promise((resolve) => {
          const onControllerChange = () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

          // Fallback timeout
          setTimeout(resolve, 2000);
        });
      }
    } catch (err) {
      console.warn('[nuxt-scripts] SW registration failed:', err);
    }
  },
})
`
        },
      })

      // Register beacon intercept plugin - patches navigator.sendBeacon to route through proxy
      // This is critical because sendBeacon bypasses Service Workers
      addPluginTemplate({
        filename: 'nuxt-scripts-beacon-intercept.client.mjs',
        getContents() {
          const rulesJson = JSON.stringify(swRules)
          return `export default defineNuxtPlugin({
  name: 'nuxt-scripts:beacon-intercept',
  enforce: 'pre',
  setup() {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;

    const rules = ${rulesJson};
    const originalBeacon = navigator.sendBeacon.bind(navigator);

    navigator.sendBeacon = (url, data) => {
      try {
        const parsed = new URL(url, window.location.origin);

        // Check if this URL matches any of our proxy rules
        for (const rule of rules) {
          if (parsed.hostname === rule.pattern || parsed.hostname.endsWith('.' + rule.pattern)) {
            // Check path prefix if specified
            if (rule.pathPrefix && !parsed.pathname.startsWith(rule.pathPrefix)) {
              continue;
            }

            // Rewrite to proxy: strip pathPrefix from original, prepend target
            const pathWithoutPrefix = rule.pathPrefix
              ? parsed.pathname.slice(rule.pathPrefix.length)
              : parsed.pathname;
            const proxyUrl = rule.target + pathWithoutPrefix + parsed.search;

            return originalBeacon(proxyUrl, data);
          }
        }
      } catch (e) {
        // URL parsing failed, pass through
      }

      return originalBeacon(url, data);
    };
  },
})
`
        },
      })

      // Store SW path in runtime config for the trigger composable
      nuxt.options.runtimeConfig.public['nuxt-scripts-sw'] = { path: swPath }

      // Register proxy handler (must be before modules:done like SW handler)
      // Only needed for anonymize mode (proxy mode can use simple Nitro route rules)
      if (firstPartyPrivacy === 'anonymize') {
        const proxyHandlerPath = await resolvePath('./runtime/server/proxy-handler')
        logger.debug('[nuxt-scripts] Registering proxy handler:', `${firstPartyCollectPrefix}/**`, '->', proxyHandlerPath)
        addServerHandler({
          route: `${firstPartyCollectPrefix}/**`,
          handler: proxyHandlerPath,
        })
      }
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
        const unsupportedScripts: string[] = []
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
            else {
              // Track scripts without proxy support
              unsupportedScripts.push(key)
            }
          }
        }

        // Warn about scripts that don't support first-party mode
        if (unsupportedScripts.length && nuxt.options.dev) {
          logger.warn(
            `First-party mode is enabled but these scripts don't support it yet: ${unsupportedScripts.join(', ')}.\n`
            + 'They will load directly from third-party servers. Request support at https://github.com/nuxt/scripts/issues',
          )
        }

        // Expose first-party status via runtime config (for DevTools and status endpoint)
        const flatRoutes: Record<string, string> = {}
        for (const [path, config] of Object.entries(neededRoutes)) {
          flatRoutes[path] = config.proxy
        }

        // Collect rewrites for all configured registry scripts
        const allRewrites: Array<{ from: string, to: string }> = []
        for (const key of registryKeys) {
          const script = registryScriptsWithImport.find(s => s.import.name === `useScript${key.charAt(0).toUpperCase() + key.slice(1)}`)
          const proxyKey = script?.proxy !== false ? (script?.proxy || key) : undefined
          if (proxyKey) {
            const proxyConfig = proxyConfigs[proxyKey]
            if (proxyConfig?.rewrite) {
              allRewrites.push(...proxyConfig.rewrite)
            }
          }
        }

        // Server-side config for proxy privacy handling
        nuxt.options.runtimeConfig['nuxt-scripts-proxy'] = {
          routes: flatRoutes,
          privacy: firstPartyPrivacy,
          rewrites: allRewrites,
        }

        // Inject route handling (handler already registered outside modules:done)
        if (Object.keys(neededRoutes).length) {
          if (firstPartyPrivacy === 'proxy') {
            // Proxy mode: use Nitro route rules with sensitive headers stripped.
            // Even in passthrough proxy mode, we must not forward auth/session
            // headers (Cookie, Authorization, etc.) to third-party analytics endpoints.
            const sanitizedRoutes: Record<string, { proxy: string, headers: Record<string, string> }> = {}
            for (const [path, config] of Object.entries(neededRoutes)) {
              sanitizedRoutes[path] = {
                proxy: config.proxy,
                headers: {
                  'cookie': '',
                  'authorization': '',
                  'proxy-authorization': '',
                  'x-csrf-token': '',
                },
              }
            }
            nuxt.options.routeRules = {
              ...nuxt.options.routeRules,
              ...sanitizedRoutes,
            }
          }
          // Anonymize mode: handler was already registered before modules:done

          // Log active proxy routes in dev
          if (nuxt.options.dev) {
            const routeCount = Object.keys(neededRoutes).length
            const scriptsCount = registryKeys.length
            logger.success(`First-party mode enabled for ${scriptsCount} script(s), ${routeCount} proxy route(s) configured (privacy: ${firstPartyPrivacy})`)
            if (logger.level >= 4) {
              for (const [path, config] of Object.entries(neededRoutes)) {
                logger.debug(`  ${path} → ${config.proxy}`)
              }
            }
          }
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

    if (nuxt.options.dev) {
      setupDevToolsUI(config, resolvePath)
    }
  },
})
