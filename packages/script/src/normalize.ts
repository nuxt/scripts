import type { NuxtUseScriptOptionsSerializable, RegistryScript } from './runtime/types'

/** Normalized registry entry: [input, scriptOptions?] tuple form. */
export type NormalizedRegistryEntry = [input: Record<string, unknown>, scriptOptions?: NormalizedScriptOptions]

export type NormalizedScriptOptions = Partial<Omit<NuxtUseScriptOptionsSerializable, 'trigger'>> & {
  trigger?: NuxtUseScriptOptionsSerializable['trigger'] | 'manual' | false
  skipValidation?: boolean
}

/** Keys hoisted from the flat config object into scriptOptions during normalization. */
const SCRIPT_OPTION_KEYS = ['trigger', 'proxy', 'bundle', 'partytown'] as const satisfies readonly (keyof NuxtUseScriptOptionsSerializable)[]

/**
 * Extract required field names from a valibot object schema.
 * Fields wrapped in `optional()` have `type: 'optional'`; everything else is required.
 */
export function extractRequiredFields(schema: RegistryScript['schema']): string[] {
  if (!schema)
    return []
  return Object.entries(schema.entries)
    .filter(([, field]) => field?.type !== 'optional')
    .map(([key]) => key)
}

/**
 * Rewrite deprecated config keys in-place before normalization.
 * Currently handles: `reverseProxyIntercept` → `proxy`.
 */
export function migrateDeprecatedRegistryKeys(
  registry: Record<string, unknown>,
  warn: (msg: string) => void,
): void {
  for (const key of Object.keys(registry)) {
    const entry = registry[key]
    if (!entry || typeof entry !== 'object')
      continue

    if (Array.isArray(entry)) {
      // Array tuple: check scriptOptions (second element)
      const opts = entry[1]
      if (opts && typeof opts === 'object' && 'reverseProxyIntercept' in opts) {
        warn(`[nuxt-scripts] registry.${key}: \`reverseProxyIntercept\` has been renamed to \`proxy\`. Please update your config. Auto-migrating for now.`)
        const o = opts as Record<string, unknown>
        o.proxy ??= o.reverseProxyIntercept
        delete o.reverseProxyIntercept
      }
    }
    else {
      const obj = entry as Record<string, unknown>
      // Top-level key
      if ('reverseProxyIntercept' in obj) {
        warn(`[nuxt-scripts] registry.${key}: \`reverseProxyIntercept\` has been renamed to \`proxy\`. Please update your config. Auto-migrating for now.`)
        obj.proxy ??= obj.reverseProxyIntercept
        delete obj.reverseProxyIntercept
      }
      // Nested scriptOptions
      const so = obj.scriptOptions
      if (so && typeof so === 'object' && 'reverseProxyIntercept' in so) {
        warn(`[nuxt-scripts] registry.${key}: \`scriptOptions.reverseProxyIntercept\` has been renamed to \`proxy\`. Please update your config. Auto-migrating for now.`)
        const s = so as Record<string, unknown>
        s.proxy ??= s.reverseProxyIntercept
        delete s.reverseProxyIntercept
      }
    }
  }
}

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
 * Aliases:
 * - `true` → `[{}, { trigger: 'onNuxtReady' }]` (deprecated, use `{ trigger: 'onNuxtReady' }`)
 * - `'proxy-only'` → build error with migration message
 */
export function normalizeRegistryConfig(
  registry: Record<string, unknown>,
  warn?: (msg: string) => void,
  componentOnlyKeys?: Set<string>,
): void {
  for (const key of Object.keys(registry)) {
    const entry = registry[key]
    if (!entry) {
      delete registry[key]
      continue
    }
    if (entry === true) {
      // Component-only scripts (embeds) have no composable; `true` means
      // "enable infrastructure" (server endpoints) with no trigger semantics.
      if (componentOnlyKeys?.has(key)) {
        registry[key] = [{}] satisfies NormalizedRegistryEntry
        continue
      }
      warn?.(`[nuxt-scripts] registry.${key}: \`true\` shorthand is deprecated. Use \`{ trigger: 'onNuxtReady' }\` instead.`)
      registry[key] = [{}, { trigger: 'onNuxtReady' }] satisfies NormalizedRegistryEntry
      continue
    }
    if (entry === 'proxy-only') {
      throw new Error(
        `[nuxt-scripts] registry.${key}: \`'proxy-only'\` is no longer supported. `
        + `Use \`{}\` instead (infrastructure only is now the default behavior).`,
      )
    }
    if (entry === 'mock') {
      registry[key] = [{}, { trigger: 'manual', skipValidation: true }] satisfies NormalizedRegistryEntry
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
      const { scriptOptions, ...rest } = entry as Record<string, unknown>
      const input: Record<string, unknown> = {}
      const mergedScriptOptions: Record<string, unknown> = {}

      // Apply legacy scriptOptions first so top-level flags take precedence
      if (scriptOptions && typeof scriptOptions === 'object')
        Object.assign(mergedScriptOptions, scriptOptions)

      for (const [k, v] of Object.entries(rest)) {
        if ((SCRIPT_OPTION_KEYS as readonly string[]).includes(k))
          mergedScriptOptions[k] = v
        else
          input[k] = v
      }

      registry[key] = Object.keys(mergedScriptOptions).length > 0
        ? [input, mergedScriptOptions]
        : [input]
    }
    else {
      delete registry[key]
    }
  }
}
