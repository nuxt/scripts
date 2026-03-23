/** Normalized registry entry: [input, scriptOptions?] tuple form. */
export type NormalizedRegistryEntry = [input: Record<string, any>, scriptOptions?: Record<string, any>]

/** Keys hoisted from the flat config object into scriptOptions during normalization. */
const SCRIPT_OPTION_KEYS = ['trigger', 'proxy', 'bundle', 'partytown'] as const

/**
 * Normalize all registry config entries in-place to [input, scriptOptions?] tuple form.
 *
 * User-facing config shapes:
 * - `false` → deleted
 * - `'mock'` → `[{}, { trigger: 'manual', skipValidation: true }]`
 * - `{}` → `[{}]` (infrastructure only, no auto-load)
 * - `{ id: '...', trigger: 'onNuxtReady' }` → `[{ id: '...' }, { trigger: 'onNuxtReady' }]`
 * - `{ id: '...', proxy: false }` → `[{ id: '...' }, { proxy: false }]`
 * - `[input, scriptOptions]` → unchanged (internal/backwards compat)
 *
 * Removed:
 * - `true` → build error with migration message
 * - `'proxy-only'` → build error with migration message
 */
export function normalizeRegistryConfig(registry: Record<string, any>): void {
  for (const key of Object.keys(registry)) {
    const entry = registry[key]
    if (!entry) {
      delete registry[key]
      continue
    }
    if (entry === true) {
      throw new Error(
        `[nuxt-scripts] registry.${key}: boolean \`true\` is no longer supported. `
        + `Use \`{}\` for infrastructure only (composable/component driven) or \`{ trigger: 'onNuxtReady' }\` for global auto-loading.`,
      )
    }
    if (entry === 'proxy-only') {
      throw new Error(
        `[nuxt-scripts] registry.${key}: \`'proxy-only'\` is no longer supported. `
        + `Use \`{}\` instead (infrastructure only is now the default behavior).`,
      )
    }
    if (entry === 'mock') {
      registry[key] = [{}, { trigger: 'manual', skipValidation: true }]
    }
    else if (Array.isArray(entry)) {
      if (!entry[0] && !entry[1]) {
        delete registry[key]
        continue
      }
      if (!entry[0])
        entry[0] = {}
    }
    else if (typeof entry === 'object') {
      const { scriptOptions, ...rest } = entry
      const input: Record<string, any> = {}
      const mergedScriptOptions: Record<string, any> = {}

      for (const [k, v] of Object.entries(rest)) {
        if ((SCRIPT_OPTION_KEYS as readonly string[]).includes(k))
          mergedScriptOptions[k] = v
        else
          input[k] = v
      }

      if (scriptOptions)
        Object.assign(mergedScriptOptions, scriptOptions)

      registry[key] = Object.keys(mergedScriptOptions).length > 0
        ? [input, mergedScriptOptions]
        : [input]
    }
    else {
      delete registry[key]
    }
  }
}
