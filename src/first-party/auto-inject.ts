import type { NuxtConfigScriptRegistry } from '../runtime/types'

interface AutoInjectDef {
  registryKey: keyof NuxtConfigScriptRegistry
  configField: string
  computeValue: (collectPrefix: string, config: Record<string, any>) => string
}

const AUTO_INJECT_DEFS: AutoInjectDef[] = [
  {
    registryKey: 'posthog',
    configField: 'apiHost',
    computeValue: (collectPrefix, config) => {
      const region = config.region || 'us'
      return region === 'eu'
        ? `${collectPrefix}/ph-eu`
        : `${collectPrefix}/ph`
    },
  },
  {
    registryKey: 'plausibleAnalytics',
    configField: 'endpoint',
    computeValue: collectPrefix => `${collectPrefix}/plausible/api/event`,
  },
  {
    registryKey: 'umamiAnalytics',
    configField: 'hostUrl',
    computeValue: collectPrefix => `${collectPrefix}/umami`,
  },
  {
    registryKey: 'rybbitAnalytics',
    configField: 'analyticsHost',
    computeValue: collectPrefix => `${collectPrefix}/rybbit/api`,
  },
  {
    registryKey: 'databuddyAnalytics',
    configField: 'apiUrl',
    computeValue: collectPrefix => `${collectPrefix}/databuddy-api`,
  },
]

/**
 * Auto-inject proxy endpoints for scripts that need explicit config
 * (e.g. PostHog api_host, Plausible endpoint) when first-party mode is enabled.
 * Modifies both module config and runtimeConfig in place.
 */
export function autoInjectProxyEndpoints(
  registry: NuxtConfigScriptRegistry,
  runtimeConfig: Record<string, any>,
  collectPrefix: string,
): void {
  for (const def of AUTO_INJECT_DEFS) {
    const entry = registry[def.registryKey]
    if (!entry)
      continue

    const rtScripts = runtimeConfig.public?.scripts as Record<string, any> | undefined
    const rtEntry = rtScripts?.[def.registryKey]
    const rtConfig = rtEntry && typeof rtEntry === 'object'
      ? (Array.isArray(rtEntry) ? rtEntry[0] : rtEntry)
      : undefined

    // For boolean/mock entries, read config from runtimeConfig (populated by REGISTRY_ENV_DEFAULTS in module.ts).
    // For object entries, read from the registry entry directly.
    let config: Record<string, any> | undefined
    if (entry === true || entry === 'mock') {
      if (!rtConfig)
        continue
      config = rtConfig
    }
    else if (typeof entry === 'object') {
      config = (Array.isArray(entry) ? entry[0] : entry) as Record<string, any>
    }

    if (!config || config[def.configField])
      continue

    const value = def.computeValue(collectPrefix, config)

    // For object entries, mutate the registry config and propagate to runtimeConfig.
    // For boolean/mock, config already points to rtConfig so only one write is needed.
    if (typeof entry === 'object') {
      config[def.configField] = value
      if (rtConfig)
        rtConfig[def.configField] = value
    }
    else {
      config[def.configField] = value
    }
  }
}
