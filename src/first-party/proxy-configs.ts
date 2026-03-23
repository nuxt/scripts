import type { RegistryScript, RegistryScriptKey } from '../runtime/types'
import type { ProxyConfig } from './types'

export { PRIVACY_FULL, PRIVACY_HEATMAP, PRIVACY_IP_ONLY, PRIVACY_NONE } from '../registry'

/**
 * Build proxy configs from registry scripts.
 * Each script with proxy capability and domains gets a proxy config.
 * Scripts with proxyConfig alias inherit from the referenced script.
 */
export function buildProxyConfigsFromRegistry(scripts: RegistryScript[]): Partial<Record<RegistryScriptKey, ProxyConfig>> {
  const configs: Partial<Record<RegistryScriptKey, ProxyConfig>> = {}
  const scriptByKey = new Map<string, RegistryScript>()

  for (const script of scripts) {
    if (script.registryKey)
      scriptByKey.set(script.registryKey, script)
  }

  for (const script of scripts) {
    if (!script.registryKey || !script.capabilities?.proxy)
      continue

    // Scripts with proxyConfig alias inherit from another script
    if (script.proxyConfig) {
      const source = scriptByKey.get(script.proxyConfig)
      if (source?.domains) {
        const domains = source.domains.map(d => typeof d === 'string' ? d : d.domain)
        configs[script.registryKey] = {
          domains,
          privacy: source.privacy || { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false },
          autoInject: source.autoInject,
          postProcess: source.postProcess,
        }
      }
      continue
    }

    if (!script.domains?.length)
      continue

    const domains = script.domains.map(d => typeof d === 'string' ? d : d.domain)
    configs[script.registryKey] = {
      domains,
      privacy: script.privacy || { ip: false, userAgent: false, language: false, screen: false, timezone: false, hardware: false },
      autoInject: script.autoInject,
      postProcess: script.postProcess,
    }
  }

  return configs
}

let _cachedConfigs: Partial<Record<RegistryScriptKey, ProxyConfig>> | undefined

/**
 * Get all proxy configs derived from the registry.
 * Lazy-loads and caches on first call. Pass `scripts` to build from a specific registry snapshot.
 */
export async function getAllProxyConfigs(_proxyPrefix?: string, scripts?: RegistryScript[]): Promise<Partial<Record<RegistryScriptKey, ProxyConfig>>> {
  if (scripts)
    return buildProxyConfigsFromRegistry(scripts)
  if (_cachedConfigs)
    return _cachedConfigs
  const { registry } = await import('../registry')
  const registryScripts = await registry()
  _cachedConfigs = buildProxyConfigsFromRegistry(registryScripts)
  return _cachedConfigs
}
