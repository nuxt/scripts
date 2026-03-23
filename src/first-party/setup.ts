import type { NormalizedRegistryEntry } from '../normalize'
import type { ProxyPrivacyInput } from '../runtime/server/utils/privacy'
import type { NuxtConfigScriptRegistry, RegistryScript, RegistryScriptKey } from '../runtime/types'
import type { ProxyAutoInject, ProxyConfig } from './types'
import { addPluginTemplate, addServerHandler } from '@nuxt/kit'
import { logger } from '../logger'

import { generateInterceptPluginContents } from './intercept-plugin'
import { buildProxyConfigsFromRegistry } from './proxy-configs'

export interface FirstPartyConfig {
  enabled: boolean
  proxyPrefix: string
  privacy: ProxyPrivacyInput | undefined
  assetsPrefix: string
  /** Pre-built proxy configs, built once at setup time */
  proxyConfigs: Partial<Record<RegistryScriptKey, ProxyConfig>>
}

export interface ModuleProxyOptions {
  proxy?: false | { prefix?: string, privacy?: import('./types').FirstPartyPrivacy }
  assets?: { prefix?: string }
}

/**
 * Check if proxy is opted-out for a specific script via its normalized registry entry
 * and/or runtimeConfig. Checks input, scriptOptions, and runtimeConfig layers.
 */
export function isProxyDisabled(
  registryKey: string,
  registry?: NuxtConfigScriptRegistry,
  runtimeConfig?: Record<string, any>,
): boolean {
  const entry = registry?.[registryKey as keyof NuxtConfigScriptRegistry] as NormalizedRegistryEntry | undefined
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

/**
 * Setup first-party mode: register proxy handler unconditionally.
 * The handler rejects unknown domains at runtime, so it's safe to register always.
 * Actual proxy configs are built in finalizeFirstParty when registry scripts are available.
 */
export async function setupFirstParty(
  config: ModuleProxyOptions,
  resolvePath: (path: string) => Promise<string>,
): Promise<FirstPartyConfig> {
  const proxyDisabled = config.proxy === false
  const proxyPrefix = typeof config.proxy === 'object'
    ? config.proxy.prefix || '/_scripts/p'
    : '/_scripts/p'
  const privacy: ProxyPrivacyInput | undefined = typeof config.proxy === 'object'
    ? config.proxy.privacy
    : undefined
  const assetsPrefix = config.assets?.prefix || '/_scripts/assets'

  const firstParty: FirstPartyConfig = { enabled: !proxyDisabled, proxyPrefix, privacy, assetsPrefix, proxyConfigs: {} }

  if (!proxyDisabled) {
    const proxyHandlerPath = await resolvePath('./runtime/server/proxy-handler')
    logger.debug('[nuxt-scripts] Registering proxy handler:', `${proxyPrefix}/**`, '->', proxyHandlerPath)
    addServerHandler({
      route: `${proxyPrefix}/**`,
      handler: proxyHandlerPath,
    })
  }

  return firstParty
}

/**
 * Apply auto-inject for a single script: sets the proxy endpoint in the script's config.
 * Expects registry entries to be pre-normalized to [input, scriptOptions?] tuple form.
 */
export function applyAutoInject(
  registry: NuxtConfigScriptRegistry,
  runtimeConfig: Record<string, any>,
  proxyPrefix: string,
  registryKey: string,
  autoInject: ProxyAutoInject,
): void {
  if (isProxyDisabled(registryKey, registry, runtimeConfig))
    return

  const entry = registry[registryKey as keyof NuxtConfigScriptRegistry] as NormalizedRegistryEntry
  const input = entry[0]

  const rtScripts = runtimeConfig.public?.scripts as Record<string, any> | undefined
  const rtEntry = rtScripts?.[registryKey]

  // Use runtimeConfig entry for reading (has env-var-resolved values),
  // fall back to input for inline configs
  const config = (rtEntry && typeof rtEntry === 'object') ? rtEntry : input
  if (!config || config[autoInject.configField])
    return

  const value = autoInject.computeValue(proxyPrefix, config)
  input[autoInject.configField] = value

  // Propagate to runtimeConfig if it's a separate object
  if (rtEntry && typeof rtEntry === 'object' && rtEntry !== input)
    rtEntry[autoInject.configField] = value
}

// -- Devtools types and helpers --

export interface FirstPartyDevtoolsScript {
  registryKey: string
  label: string
  logo: string
  category: string
  configKey: string
  mechanism: 'bundle-rewrite-intercept' | 'config-injection-proxy'
  hasAutoInject: boolean
  autoInjectField?: string
  hasPostProcess: boolean
  privacy: { ip: boolean, userAgent: boolean, language: boolean, screen: boolean, timezone: boolean, hardware: boolean }
  privacyLevel: 'full' | 'partial' | 'none'
  domains: string[]
}

export interface FirstPartyDevtoolsData {
  enabled: boolean
  proxyPrefix: string
  privacyMode: string
  scripts: FirstPartyDevtoolsScript[]
  totalDomains: number
}

function computePrivacyLevel(privacy: Record<string, boolean>): 'full' | 'partial' | 'none' {
  const flags = Object.values(privacy)
  if (flags.every(Boolean))
    return 'full'
  if (flags.some(Boolean))
    return 'partial'
  return 'none'
}

function buildDevtoolsEntry(
  key: string,
  script: RegistryScript,
  configKey: string,
  proxyConfig: ProxyConfig,
): FirstPartyDevtoolsScript {
  const privacy = proxyConfig.privacy as Record<string, boolean>
  const normalizedPrivacy = {
    ip: !!privacy.ip,
    userAgent: !!privacy.userAgent,
    language: !!privacy.language,
    screen: !!privacy.screen,
    timezone: !!privacy.timezone,
    hardware: !!privacy.hardware,
  }
  const logo = script.logo
  const logoStr = typeof logo === 'object' ? (logo.dark || logo.light) : (logo || '')

  return {
    registryKey: key,
    label: script.label || key,
    logo: logoStr,
    category: script.category || 'unknown',
    configKey,
    mechanism: script.src === false ? 'config-injection-proxy' : 'bundle-rewrite-intercept',
    hasAutoInject: !!proxyConfig.autoInject,
    autoInjectField: proxyConfig.autoInject?.configField,
    hasPostProcess: !!proxyConfig.postProcess,
    privacy: normalizedPrivacy,
    privacyLevel: computePrivacyLevel(normalizedPrivacy),
    domains: [...proxyConfig.domains],
  }
}

function buildDevtoolsData(
  proxyPrefix: string,
  privacyLabel: string,
  scripts: FirstPartyDevtoolsScript[],
): FirstPartyDevtoolsData {
  const allDomains = new Set<string>()
  for (const s of scripts) {
    for (const d of s.domains)
      allDomains.add(d)
  }
  return {
    enabled: true,
    proxyPrefix,
    privacyMode: privacyLabel,
    scripts,
    totalDomains: allDomains.size,
  }
}

// -- Finalize --

export interface FinalizeFirstPartyResult {
  proxyPrefix: string
  devtools?: FirstPartyDevtoolsData
}

/**
 * Finalize first-party setup inside modules:done.
 * Builds proxy configs, collects domain privacy mappings, registers intercept plugin.
 */
export function finalizeFirstParty(opts: {
  firstParty: FirstPartyConfig
  registry: NuxtConfigScriptRegistry | undefined
  registryScripts: RegistryScript[]
  scriptByKey: Map<string, RegistryScript>
  nuxtOptions: { dev: boolean, runtimeConfig: Record<string, any> }
}): FinalizeFirstPartyResult {
  const { firstParty, registryScripts, scriptByKey, nuxtOptions } = opts
  const { proxyPrefix } = firstParty

  // Build proxy configs from registry (single source of truth)
  const proxyConfigs = buildProxyConfigsFromRegistry(registryScripts, scriptByKey)
  firstParty.proxyConfigs = proxyConfigs
  const registryKeys = Object.keys(opts.registry || {})

  // Collect domain privacy mappings
  const domainPrivacy: Record<string, ProxyPrivacyInput> = {}
  const unsupportedScripts: string[] = []
  const unmatchedScripts: string[] = []
  let totalDomains = 0
  const devtoolsScripts: FirstPartyDevtoolsScript[] = []

  for (const key of registryKeys) {
    const script = scriptByKey.get(key)
    if (!script) {
      unmatchedScripts.push(key)
      continue
    }

    if (!script.capabilities?.proxy)
      continue

    if (isProxyDisabled(key, opts.registry))
      continue

    const configKey = (script.proxyConfig || key) as RegistryScriptKey
    const proxyConfig = proxyConfigs[configKey]

    if (!proxyConfig) {
      unsupportedScripts.push(key)
      continue
    }

    for (const domain of proxyConfig.domains) {
      domainPrivacy[domain] = proxyConfig.privacy
      totalDomains++
    }

    if (proxyConfig.autoInject && opts.registry)
      applyAutoInject(opts.registry, nuxtOptions.runtimeConfig, proxyPrefix, key, proxyConfig.autoInject)

    if (nuxtOptions.dev)
      devtoolsScripts.push(buildDevtoolsEntry(key, script, configKey, proxyConfig))
  }

  if (unmatchedScripts.length) {
    logger.warn(
      `First-party mode: could not find registry scripts for: ${unmatchedScripts.join(', ')}.\n`
      + 'These scripts will not have proxy routes registered. Check that the registry key matches a known script.',
    )
  }
  if (unsupportedScripts.length && nuxtOptions.dev) {
    logger.warn(
      `First-party mode is enabled but these scripts don't support it yet: ${unsupportedScripts.join(', ')}.\n`
      + 'They will load directly from third-party servers. Request support at https://github.com/nuxt/scripts/issues',
    )
  }

  // Register intercept plugin
  addPluginTemplate({
    filename: 'nuxt-scripts-intercept.client.mjs',
    getContents() {
      return generateInterceptPluginContents(proxyPrefix)
    },
  })

  // Server-side config
  nuxtOptions.runtimeConfig['nuxt-scripts-proxy'] = {
    proxyPrefix,
    domainPrivacy,
    privacy: firstParty.privacy,
  } as any

  const privacyLabel = firstParty.privacy === undefined ? 'per-script' : typeof firstParty.privacy === 'boolean' ? (firstParty.privacy ? 'anonymize' : 'passthrough') : 'custom'

  if (totalDomains > 0 && nuxtOptions.dev) {
    logger.success(`First-party mode enabled for ${registryKeys.length} script(s), ${totalDomains} domain(s) proxied (privacy: ${privacyLabel})`)
  }

  // Warn for static presets
  const staticPresets = ['static', 'github-pages', 'cloudflare-pages-static', 'netlify-static', 'azure-static', 'firebase-static']
  const preset = process.env.NITRO_PRESET || ''
  if (staticPresets.includes(preset)) {
    logger.warn(
      `First-party collection endpoints require a server runtime (detected: ${preset || 'static'}).\n`
      + 'Scripts will be bundled, but collection requests will not be proxied.\n'
      + '\n'
      + 'Options:\n'
      + '  1. Configure platform rewrites (Vercel, Netlify, Cloudflare)\n'
      + '  2. Switch to server-rendered mode (ssr: true)\n'
      + '  3. Disable with proxy: false\n'
      + '\n'
      + 'See: https://scripts.nuxt.com/docs/guides/first-party#static-hosting',
    )
  }

  const devtools = nuxtOptions.dev
    ? buildDevtoolsData(proxyPrefix, privacyLabel, devtoolsScripts)
    : undefined

  return { proxyPrefix, devtools }
}
