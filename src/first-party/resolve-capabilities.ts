import type { RegistryScript, ScriptCapabilities } from '../runtime/types'
import { logger } from '../logger'

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
