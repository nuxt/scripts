import type { ProxyPrivacyInput } from '../runtime/server/utils/privacy'
import type { NuxtConfigScriptRegistry, RegistryScript, RegistryScriptKey } from '../runtime/types'
import type { ProxyAutoInject, ProxyConfig } from './types'
import { addPluginTemplate, addServerHandler } from '@nuxt/kit'
import { logger } from '../logger'

import { generateInterceptPluginContents } from './intercept-plugin'
import { getAllProxyConfigs } from './proxy-configs'

export interface FirstPartyConfig {
  enabled: boolean
  proxyPrefix: string
  privacy: ProxyPrivacyInput | undefined
  assetsPrefix: string
  /** Pre-built proxy configs, built once at setup time */
  proxyConfigs: Partial<Record<RegistryScriptKey, ProxyConfig>>
}

export interface ModuleFirstPartyOptions {
  firstParty?: boolean | import('./types').FirstPartyOptions
  assets?: { prefix?: string }
}

/**
 * Setup first-party mode: resolve config, build proxy configs once, register proxy handler.
 * Call before modules:done. Returns the config needed by finalizeFirstParty and the transform plugin.
 */
export async function setupFirstParty(
  config: ModuleFirstPartyOptions,
  resolvePath: (path: string) => Promise<string>,
): Promise<FirstPartyConfig> {
  const enabled = !!config.firstParty
  const proxyPrefix = typeof config.firstParty === 'object'
    ? config.firstParty.proxyPrefix || '/_scripts/p'
    : '/_scripts/p'
  const privacy: ProxyPrivacyInput | undefined = typeof config.firstParty === 'object'
    ? config.firstParty.privacy
    : undefined
  const assetsPrefix = config.assets?.prefix || '/_scripts/assets'

  // Build all proxy configs once — reused by finalize and transform plugin
  const proxyConfigs = enabled ? getAllProxyConfigs(proxyPrefix) : {}

  const firstParty: FirstPartyConfig = { enabled, proxyPrefix, privacy, assetsPrefix, proxyConfigs }

  if (enabled) {
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
  const entry = registry[registryKey as keyof NuxtConfigScriptRegistry] as [Record<string, any>, any?] | undefined
  if (!entry)
    return

  const input = entry[0]
  const scriptOptions = entry[1] as Record<string, any> | undefined

  // Per-script firstParty opt-out (in input or scriptOptions)
  if (input?.firstParty === false || scriptOptions?.firstParty === false)
    return
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

export interface FinalizeFirstPartyResult {
  proxyPrefix: string
  devtools?: FirstPartyDevtoolsData
}

/**
 * Finalize first-party setup inside modules:done.
 * Uses pre-built proxyConfigs from setupFirstParty — no rebuild.
 * Returns intercept rules (for partytown resolveUrl) and devtools data.
 */
export function finalizeFirstParty(opts: {
  firstParty: FirstPartyConfig
  registry: NuxtConfigScriptRegistry | undefined
  registryScripts: RegistryScript[]
  nuxtOptions: { dev: boolean, runtimeConfig: Record<string, any> }
}): FinalizeFirstPartyResult {
  const { firstParty, registryScripts, nuxtOptions } = opts
  const { proxyConfigs, proxyPrefix } = firstParty
  const registryKeys = Object.keys(opts.registry || {})

  // Build lookup: registryKey → RegistryScript
  const scriptByKey = new Map<string, RegistryScript>()
  for (const script of registryScripts) {
    if (script.registryKey)
      scriptByKey.set(script.registryKey, script)
  }

  // Collect domain privacy mappings
  const domainPrivacy: Record<string, ProxyPrivacyInput> = {}
  const unsupportedScripts: string[] = []
  const unmatchedScripts: string[] = []
  let totalDomains = 0

  // Devtools: per-script data
  const devtoolsScripts: FirstPartyDevtoolsScript[] = []

  for (const key of registryKeys) {
    const script = scriptByKey.get(key)
    if (!script) {
      unmatchedScripts.push(key)
      continue
    }

    if (script.proxy === false)
      continue

    // Check per-script firstParty opt-out in registry config entry
    // Entries are normalized to [input, scriptOptions?] tuple form
    const registryEntry = opts.registry?.[key as keyof NuxtConfigScriptRegistry] as [Record<string, any>, Record<string, any>?] | undefined
    const entryScriptOptions = registryEntry?.[1]
    const entryInput = registryEntry?.[0]
    if (entryScriptOptions?.firstParty === false || entryInput?.firstParty === false)
      continue

    const configKey = (script.proxy || key) as RegistryScriptKey
    const proxyConfig = proxyConfigs[configKey]

    if (!proxyConfig) {
      if (script.scriptBundling !== false)
        unsupportedScripts.push(key)
      continue
    }

    // Map each domain to its privacy config
    for (const domain of proxyConfig.domains) {
      domainPrivacy[domain] = proxyConfig.privacy
      totalDomains++
    }

    // Auto-inject proxy endpoint config
    if (proxyConfig.autoInject && opts.registry)
      applyAutoInject(opts.registry, nuxtOptions.runtimeConfig, proxyPrefix, key, proxyConfig.autoInject)

    // Build devtools entry
    if (nuxtOptions.dev) {
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

      devtoolsScripts.push({
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
      })
    }
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
    const scriptsCount = registryKeys.length
    logger.success(`First-party mode enabled for ${scriptsCount} script(s), ${totalDomains} domain(s) proxied (privacy: ${privacyLabel})`)
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
      + '  3. Disable with firstParty: false\n'
      + '\n'
      + 'See: https://scripts.nuxt.com/docs/guides/first-party#static-hosting',
    )
  }

  // Build devtools data in dev mode
  let devtools: FirstPartyDevtoolsData | undefined
  if (nuxtOptions.dev) {
    const allDomains = new Set<string>()
    for (const s of devtoolsScripts) {
      for (const d of s.domains)
        allDomains.add(d)
    }

    devtools = {
      enabled: true,
      proxyPrefix,
      privacyMode: privacyLabel,
      scripts: devtoolsScripts,
      totalDomains: allDomains.size,
    }
  }

  return { proxyPrefix, devtools }
}
