import type { NormalizedRegistryEntry } from '../normalize'
import type { ProxyPrivacyInput } from '../runtime/server/utils/privacy'
import type { NuxtConfigScriptRegistry, RegistryScript, RegistryScriptKey, ScriptCapabilities } from '../runtime/types'
import type { ProxyAutoInject, ProxyConfig } from './types'
import { addPluginTemplate, addServerHandler } from '@nuxt/kit'
import { logger } from '../logger'

// -- Capability resolution --

/**
 * Generate a Partytown `resolveUrl` function string for first-party proxying.
 * This is the web-worker equivalent of the intercept plugin; Partytown calls this
 * for every network request (fetch, XHR, sendBeacon, Image, script) made by worker-executed scripts.
 *
 * Any non-same-origin URL is proxied through `proxyPrefix/<host><path>`.
 */
export function generatePartytownResolveUrl(proxyPrefix: string): string {
  return `function(url, location, type) {
  if (url.origin !== location.origin) {
    return new URL(${JSON.stringify(proxyPrefix)} + '/' + url.host + url.pathname + url.search, location.origin);
  }
}`
}

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

// -- Intercept plugin generation --

/**
 * Generate the client-side intercept plugin contents.
 * This plugin provides __nuxtScripts runtime helpers (sendBeacon, fetch, XMLHttpRequest, Image)
 * that route matching URLs through the first-party proxy. AST rewriting transforms
 * native API calls to use these wrappers at build time.
 *
 * Any non-same-origin URL is proxied through `proxyPrefix/<host><path>`.
 * No domain allowlist needed: only AST-rewritten third-party scripts call __nuxtScripts.
 */
export function generateInterceptPluginContents(proxyPrefix: string): string {
  return `export default defineNuxtPlugin({
  name: 'nuxt-scripts:intercept',
  enforce: 'pre',
  setup() {
    const proxyPrefix = ${JSON.stringify(proxyPrefix)};
    const origBeacon = typeof navigator !== 'undefined' && navigator.sendBeacon
      ? navigator.sendBeacon.bind(navigator)
      : () => false;
    const origFetch = globalThis.fetch.bind(globalThis);

    function proxyUrl(url) {
      try {
        const parsed = new URL(url, location.origin);
        if (parsed.origin !== location.origin)
          return location.origin + proxyPrefix + '/' + parsed.host + parsed.pathname + parsed.search;
      } catch {}
      return url;
    }

    // XMLHttpRequest wrapper — intercepts .open() to rewrite URL
    const OrigXHR = XMLHttpRequest;
    class ProxiedXHR extends OrigXHR {
      open() {
        const args = Array.from(arguments);
        if (typeof args[1] === 'string') args[1] = proxyUrl(args[1]);
        return super.open.apply(this, args);
      }
    }
    // Image wrapper — intercepts .src setter to rewrite URL
    const OrigImage = Image;
    const origSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    function ProxiedImage(w, h) {
      const img = arguments.length === 2 ? new OrigImage(w, h)
        : arguments.length === 1 ? new OrigImage(w) : new OrigImage();
      if (origSrcDesc && origSrcDesc.set) {
        Object.defineProperty(img, 'src', {
          get() { return origSrcDesc.get.call(this); },
          set(v) { origSrcDesc.set.call(this, typeof v === 'string' ? proxyUrl(v) : v); },
          configurable: true,
        });
      }
      return img;
    }

    globalThis.__nuxtScripts = {
      sendBeacon: (url, data) => origBeacon(proxyUrl(url), data),
      fetch: (url, opts) => {
        if (typeof url === 'string') return origFetch(proxyUrl(url), opts);
        if (url instanceof Request) return origFetch(new Request(proxyUrl(url.url), url), opts);
        return origFetch(url, opts);
      },
      XMLHttpRequest: ProxiedXHR,
      Image: ProxiedImage,
    };
  },
})
`
}

// -- Proxy config building --

export { PRIVACY_FULL, PRIVACY_HEATMAP, PRIVACY_IP_ONLY, PRIVACY_NONE } from '../registry'

/**
 * Build proxy configs from registry scripts.
 * Each script with proxy capability and domains gets a proxy config.
 * Scripts with proxyConfig alias inherit from the referenced script.
 */
export function buildProxyConfigsFromRegistry(
  scripts: RegistryScript[],
  scriptByKey?: Map<string, RegistryScript>,
): Partial<Record<RegistryScriptKey, ProxyConfig>> {
  const configs: Partial<Record<RegistryScriptKey, ProxyConfig>> = {}

  if (!scriptByKey) {
    scriptByKey = new Map()
    for (const script of scripts) {
      if (script.registryKey)
        scriptByKey.set(script.registryKey, script)
    }
  }

  for (const script of scripts) {
    if (!script.registryKey || !script.capabilities?.proxy)
      continue

    // Resolve source: aliased scripts inherit from their proxyConfig target
    const source = script.proxyConfig ? scriptByKey.get(script.proxyConfig) : script
    if (!source?.domains?.length)
      continue

    configs[script.registryKey] = {
      domains: source.domains.map(d => typeof d === 'string' ? d : d.domain),
      privacy: source.privacy || { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false },
      autoInject: source.autoInject,
      postProcess: source.postProcess,
    }
  }

  return configs
}

/**
 * Resolve the effective capabilities for a script by merging:
 * 1. Start with script.defaultCapability (or {} if absent)
 * 2. Apply user overrides from scriptOptions (proxy, bundle, partytown)
 * 3. Clamp to script.capabilities ceiling (user can't enable unsupported capabilities)
 * 4. Warn in dev if user tries to exceed ceiling
 */
export function resolveCapabilities(
  script: RegistryScript,
  scriptOptions?: Record<string, any>,
): ScriptCapabilities {
  const defaults = script.defaultCapability ?? {}
  const ceiling = script.capabilities ?? {}

  const resolved: ScriptCapabilities = { ...defaults }

  if (!scriptOptions)
    return resolved

  const overrideKeys: (keyof ScriptCapabilities)[] = ['proxy', 'bundle', 'partytown']

  for (const key of overrideKeys) {
    if (key in scriptOptions) {
      const userValue = scriptOptions[key]
      if (typeof userValue !== 'boolean')
        continue

      if (userValue && !ceiling[key]) {
        // User trying to enable unsupported capability
        if (import.meta.dev) {
          logger.warn(
            `[nuxt-scripts] Script "${script.registryKey}" does not support capability "${key}". `
            + `This override will be ignored. Supported capabilities: ${JSON.stringify(ceiling)}`,
          )
        }
        continue
      }

      resolved[key] = userValue
    }
  }

  return resolved
}
