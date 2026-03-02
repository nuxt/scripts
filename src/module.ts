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
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve as resolvePath_ } from 'pathe'
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
import { getAllProxyConfigs, getInterceptRules } from './proxy-configs'
import type { ProxyPrivacyInput } from './runtime/server/utils/privacy'

declare module '@nuxt/schema' {
  interface NuxtHooks {
    'scripts:registry': (registry: RegistryScripts) => void | Promise<void>
  }
}

/**
 * Global privacy override for all first-party proxy requests.
 *
 * By default (`undefined`), each script uses its own privacy controls declared in the registry.
 * Setting this overrides all per-script defaults:
 *
 * - `true` - Full anonymize: anonymizes IP, normalizes User-Agent/language,
 *   generalizes screen/hardware/canvas/timezone data.
 *
 * - `false` - Passthrough: forwards headers and data, but strips sensitive
 *   auth/session headers (cookie, authorization).
 *
 * - `{ ip: false }` - Selective: override individual flags. Unset flags inherit
 *   from the per-script default.
 */
export type FirstPartyPrivacy = ProxyPrivacyInput

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
   * Global privacy override for all proxied scripts.
   *
   * By default, each script uses its own privacy controls from the registry.
   * Set this to override all scripts at once:
   *
   * - `true` - Full anonymize for all scripts
   * - `false` - Passthrough for all scripts (still strips sensitive auth headers)
   * - `{ ip: false }` - Selective override (unset flags inherit per-script defaults)
   *
   * @default undefined
   */
  privacy?: FirstPartyPrivacy
}

/**
 * Partytown forward config for registry scripts.
 * Scripts not listed here are likely incompatible due to DOM access requirements.
 * @see https://partytown.qwik.dev/forwarding-events
 */
// Matches self-closing PascalCase or kebab-case tags starting with "Script"/"script-"
// e.g. <ScriptYouTubePlayer video-id="x" /> or <script-youtube-player />
const SELF_CLOSING_SCRIPT_RE = /<((?:Script[A-Z]|script-)\w[\w-]*)\b([^>]*?)\s*\/\s*>/g

/**
 * Expand self-closing `<Script*>` component tags in page files to work around
 * a Nuxt core regex issue (nuxt `SFC_SCRIPT_RE` uses case-insensitive matching).
 */
function fixSelfClosingScriptComponents(nuxt: any) {
  function expandTags(content: string): string | null {
    SELF_CLOSING_SCRIPT_RE.lastIndex = 0
    if (!SELF_CLOSING_SCRIPT_RE.test(content)) return null
    SELF_CLOSING_SCRIPT_RE.lastIndex = 0
    return content.replace(SELF_CLOSING_SCRIPT_RE, '<$1$2></$1>')
  }

  function fixFile(filePath: string) {
    if (!existsSync(filePath)) return
    const content = readFileSync(filePath, 'utf-8')
    const fixed = expandTags(content)
    if (fixed) nuxt.vfs[filePath] = fixed
    else delete nuxt.vfs[filePath]
  }

  function scanDir(dir: string) {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = resolvePath_(dir, entry.name)
      if (entry.isDirectory()) scanDir(fullPath)
      else if (entry.name.endsWith('.vue')) fixFile(fullPath)
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
      if (!relativePath.endsWith('.vue')) return
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
    const preset = process.env.NITRO_PRESET || ''
    const isStaticPreset = staticPresets.includes(preset)

    const firstPartyEnabled = !!config.firstParty
    const firstPartyPrefix = typeof config.firstParty === 'object' ? config.firstParty.prefix : undefined
    const firstPartyCollectPrefix = typeof config.firstParty === 'object'
      ? config.firstParty.collectPrefix || '/_proxy'
      : '/_proxy'
    const firstPartyPrivacy: ProxyPrivacyInput | undefined = typeof config.firstParty === 'object'
      ? config.firstParty.privacy
      : undefined
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

    logger.debug('[nuxt-scripts] First-party config:', { firstPartyEnabled, firstPartyPrivacy, firstPartyCollectPrefix })

    // Setup first-party proxy mode (must be before modules:done)
    if (firstPartyEnabled) {
      const interceptRules = getInterceptRules(firstPartyCollectPrefix)

      // Register __nuxtScripts runtime helper — provides sendBeacon/fetch wrappers
      // that route matching URLs through the first-party proxy. AST rewriting transforms
      // navigator.sendBeacon/fetch calls to use these wrappers at build time.
      addPluginTemplate({
        filename: 'nuxt-scripts-intercept.client.mjs',
        getContents() {
          const rulesJson = JSON.stringify(interceptRules)
          return `export default defineNuxtPlugin({
  name: 'nuxt-scripts:intercept',
  enforce: 'pre',
  setup() {
    const rules = ${rulesJson};
    const origBeacon = typeof navigator !== 'undefined' && navigator.sendBeacon
      ? navigator.sendBeacon.bind(navigator)
      : () => false;
    const origFetch = globalThis.fetch.bind(globalThis);

    function rewriteUrl(url) {
      try {
        const parsed = new URL(url, location.origin);
        for (const rule of rules) {
          if (parsed.hostname === rule.pattern || parsed.hostname.endsWith('.' + rule.pattern)) {
            if (rule.pathPrefix && !parsed.pathname.startsWith(rule.pathPrefix)) continue;
            const path = rule.pathPrefix ? parsed.pathname.slice(rule.pathPrefix.length) : parsed.pathname;
            return location.origin + rule.target + (path.startsWith('/') ? '' : '/') + path + parsed.search;
          }
        }
      } catch {}
      return url;
    }

    globalThis.__nuxtScripts = {
      sendBeacon: (url, data) => origBeacon(rewriteUrl(url), data),
      fetch: (url, opts) => origFetch(typeof url === 'string' ? rewriteUrl(url) : url, opts),
    };
  },
})
`
        },
      })

      // Register proxy handler for both privacy modes (must be before modules:done)
      // Both modes need the handler: 'proxy' strips sensitive headers, 'anonymize' also strips fingerprinting
      const proxyHandlerPath = await resolvePath('./runtime/server/proxy-handler')
      logger.debug('[nuxt-scripts] Registering proxy handler:', `${firstPartyCollectPrefix}/**`, '->', proxyHandlerPath)
      addServerHandler({
        route: `${firstPartyCollectPrefix}/**`,
        handler: proxyHandlerPath,
      })
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

      // Inject proxy route rules if first-party mode is enabled
      if (firstPartyEnabled) {
        const proxyConfigs = getAllProxyConfigs(firstPartyCollectPrefix)
        const registryKeys = Object.keys(config.registry || {})

        // Collect routes for all configured registry scripts that support proxying
        const neededRoutes: Record<string, { proxy: string }> = {}
        const routePrivacyOverrides: Record<string, ProxyPrivacyInput> = {}
        const unsupportedScripts: string[] = []
        for (const key of registryKeys) {
          // Find the registry script definition
          const script = registryScriptsWithImport.find(s => s.import.name.toLowerCase() === `usescript${key.toLowerCase()}`)
          // Only proxy scripts that explicitly opt in with a proxy field
          const proxyKey = script?.proxy || undefined
          if (proxyKey) {
            const proxyConfig = proxyConfigs[proxyKey]
            if (proxyConfig?.routes) {
              Object.assign(neededRoutes, proxyConfig.routes)
              // Record per-script privacy for each route
              for (const routePath of Object.keys(proxyConfig.routes)) {
                routePrivacyOverrides[routePath] = proxyConfig.privacy
              }
            }
            else {
              // Track scripts without proxy support
              unsupportedScripts.push(key)
            }
          }
        }

        // Auto-inject apiHost for PostHog when first-party proxy is enabled
        // PostHog uses NPM mode so URL rewrites don't apply - we set api_host via config instead
        if (config.registry?.posthog && typeof config.registry.posthog === 'object') {
          const phConfig = config.registry.posthog as Record<string, any>
          if (!phConfig.apiHost) {
            const region = phConfig.region || 'us'
            phConfig.apiHost = region === 'eu'
              ? `${firstPartyCollectPrefix}/ph-eu`
              : `${firstPartyCollectPrefix}/ph`
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

        // Server-side config for proxy privacy handling
        nuxt.options.runtimeConfig['nuxt-scripts-proxy'] = {
          routes: flatRoutes,
          privacy: firstPartyPrivacy, // undefined = use per-script defaults, set = global override
          routePrivacy: routePrivacyOverrides, // per-script privacy from registry
        } as any

        // Proxy handler is registered before modules:done for both privacy modes
        if (Object.keys(neededRoutes).length) {
          // Log active proxy routes in dev
          if (nuxt.options.dev) {
            const routeCount = Object.keys(neededRoutes).length
            const scriptsCount = registryKeys.length
            const privacyLabel = firstPartyPrivacy === undefined ? 'per-script' : typeof firstPartyPrivacy === 'boolean' ? (firstPartyPrivacy ? 'anonymize' : 'passthrough') : 'custom'
            logger.success(`First-party mode enabled for ${scriptsCount} script(s), ${routeCount} proxy route(s) configured (privacy: ${privacyLabel})`)
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
