import type { RegistryScript, RegistryScriptKey } from '../runtime/types'
import type { ProxyConfig } from './types'

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
