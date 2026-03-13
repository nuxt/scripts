import type { ProxyPrivacyInput } from '../runtime/server/utils/privacy'
import type { NuxtConfigScriptRegistry, RegistryScript } from '../runtime/types'
import type { InterceptRule } from './types'
import { addPluginTemplate, addServerHandler } from '@nuxt/kit'
import { logger } from '../logger'
import { autoInjectProxyEndpoints } from './auto-inject'
import { generateInterceptPluginContents } from './intercept-plugin'
import { getAllProxyConfigs, routesToInterceptRules } from './proxy-configs'

export interface FirstPartyConfig {
  enabled: boolean
  prefix: string | undefined
  collectPrefix: string
  privacy: ProxyPrivacyInput | undefined
  assetsPrefix: string
}

export interface ModuleFirstPartyOptions {
  firstParty?: boolean | import('./types').FirstPartyOptions
  assets?: { prefix?: string }
}

/**
 * Resolve first-party configuration from module options.
 */
export function resolveFirstPartyConfig(config: ModuleFirstPartyOptions): FirstPartyConfig {
  const enabled = !!config.firstParty
  const prefix = typeof config.firstParty === 'object' ? config.firstParty.prefix : undefined
  const collectPrefix = typeof config.firstParty === 'object'
    ? config.firstParty.collectPrefix || '/_scripts/c'
    : '/_scripts/c'
  const privacy: ProxyPrivacyInput | undefined = typeof config.firstParty === 'object'
    ? config.firstParty.privacy
    : undefined
  const assetsPrefix = prefix || config.assets?.prefix || '/_scripts/assets'

  return { enabled, prefix, collectPrefix, privacy, assetsPrefix }
}

/**
 * Register the intercept plugin and proxy server handler.
 * Must be called before modules:done. Returns a mutable interceptRules array
 * that the plugin template captures by closure reference.
 */
export async function setupFirstPartyHandlers(
  firstParty: FirstPartyConfig,
  resolvePath: (path: string) => Promise<string>,
): Promise<InterceptRule[]> {
  // Populated inside modules:done with only the configured scripts' routes
  const interceptRules: InterceptRule[] = []

  // Register __nuxtScripts runtime helper
  addPluginTemplate({
    filename: 'nuxt-scripts-intercept.client.mjs',
    getContents() {
      return generateInterceptPluginContents(interceptRules)
    },
  })

  // Register proxy handler
  const proxyHandlerPath = await resolvePath('./runtime/server/proxy-handler')
  logger.debug('[nuxt-scripts] Registering proxy handler:', `${firstParty.collectPrefix}/**`, '->', proxyHandlerPath)
  addServerHandler({
    route: `${firstParty.collectPrefix}/**`,
    handler: proxyHandlerPath,
  })

  return interceptRules
}

/**
 * Finalize first-party setup inside modules:done.
 * Computes proxy routes for configured scripts, auto-injects endpoints,
 * and populates runtimeConfig.
 */
export function finalizeFirstParty(opts: {
  firstParty: FirstPartyConfig
  interceptRules: InterceptRule[]
  registry: NuxtConfigScriptRegistry | undefined
  registryScripts: RegistryScript[]
  registryScriptsWithImport: (RegistryScript & { import: NonNullable<RegistryScript['import']> })[]
  nuxtOptions: { dev: boolean, runtimeConfig: Record<string, any> }
}): void {
  const { firstParty, interceptRules, registryScripts, registryScriptsWithImport, nuxtOptions } = opts
  const proxyConfigs = getAllProxyConfigs(firstParty.collectPrefix)
  const registryKeys = Object.keys(opts.registry || {})

  // Build lookup map: registryKey → RegistryScript (all scripts, not just those with imports)
  const scriptByKey = new Map<string, RegistryScript>()
  for (const script of registryScripts) {
    if (script.registryKey) {
      scriptByKey.set(script.registryKey, script)
    }
  }

  // Collect routes for all configured registry scripts that support proxying
  const neededRoutes: Record<string, { proxy: string }> = {}
  const routePrivacyOverrides: Record<string, ProxyPrivacyInput> = {}
  const unsupportedScripts: string[] = []
  const unmatchedScripts: string[] = []
  for (const key of registryKeys) {
    // Direct lookup by registryKey (robust), fallback to import name convention (legacy)
    const script = scriptByKey.get(key)
      || registryScriptsWithImport.find(s => s.import.name.toLowerCase() === `usescript${key.toLowerCase()}`)
    if (!script) {
      unmatchedScripts.push(key)
      continue
    }
    const proxyKey = script?.proxy || undefined
    if (proxyKey) {
      const proxyConfig = proxyConfigs[proxyKey]
      if (proxyConfig?.routes) {
        Object.assign(neededRoutes, proxyConfig.routes)
        for (const routePath of Object.keys(proxyConfig.routes)) {
          routePrivacyOverrides[routePath] = proxyConfig.privacy
        }
      }
      else {
        unsupportedScripts.push(key)
      }
    }
  }

  // Auto-inject proxy endpoints for scripts that need explicit config
  if (opts.registry) {
    autoInjectProxyEndpoints(opts.registry, nuxtOptions.runtimeConfig, firstParty.collectPrefix)
  }

  // Warn about scripts that couldn't be matched to a registry entry
  if (unmatchedScripts.length) {
    logger.warn(
      `First-party mode: could not find registry scripts for: ${unmatchedScripts.join(', ')}.\n`
      + 'These scripts will not have proxy routes registered. Check that the registry key matches a known script.',
    )
  }

  // Warn about scripts that don't support first-party mode
  if (unsupportedScripts.length && nuxtOptions.dev) {
    logger.warn(
      `First-party mode is enabled but these scripts don't support it yet: ${unsupportedScripts.join(', ')}.\n`
      + 'They will load directly from third-party servers. Request support at https://github.com/nuxt/scripts/issues',
    )
  }

  // Compute intercept rules (mutates the array captured by the plugin template closure)
  interceptRules.push(...routesToInterceptRules(neededRoutes))

  // Server-side config for proxy privacy handling
  const flatRoutes: Record<string, string> = {}
  for (const [path, config] of Object.entries(neededRoutes)) {
    flatRoutes[path] = config.proxy
  }

  nuxtOptions.runtimeConfig['nuxt-scripts-proxy'] = {
    routes: flatRoutes,
    privacy: firstParty.privacy,
    routePrivacy: routePrivacyOverrides,
  } as any

  if (Object.keys(neededRoutes).length && nuxtOptions.dev) {
    const routeCount = Object.keys(neededRoutes).length
    const scriptsCount = registryKeys.length
    const privacyLabel = firstParty.privacy === undefined ? 'per-script' : typeof firstParty.privacy === 'boolean' ? (firstParty.privacy ? 'anonymize' : 'passthrough') : 'custom'
    logger.success(`First-party mode enabled for ${scriptsCount} script(s), ${routeCount} proxy route(s) configured (privacy: ${privacyLabel})`)
    if (logger.level >= 4) {
      for (const [path, config] of Object.entries(neededRoutes)) {
        logger.debug(`  ${path} → ${config.proxy}`)
      }
    }
  }

  // Warn for static presets with actionable guidance
  const staticPresets = ['static', 'github-pages', 'cloudflare-pages-static']
  const preset = process.env.NITRO_PRESET || ''
  if (staticPresets.includes(preset)) {
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
