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
 * Normalize all registry config entries in-place to [input, scriptOptions?] tuple form.
 *
 * User-facing config shapes:
 * - `false` → deleted
 * - `'mock'` → `[{}, { trigger: 'manual', skipValidation: true }]`
 * - `{}` → `[{}]` (infrastructure only, no auto-load)
 * - `{ id: '...', trigger: 'onNuxtReady' }` → `[{ id: '...' }, { trigger: 'onNuxtReady' }]`
 * - `{ id: '...', proxy: false }` → `[{ id: '...' }, { proxy: false }]`
 */
export function normalizeRegistryConfig(registry: Record<string, unknown>): void {
  for (const key of Object.keys(registry)) {
    const entry = registry[key]
    if (entry === false || entry === null || entry === undefined) {
      delete registry[key]
      continue
    }
    if (entry === 'mock') {
      registry[key] = [{}, { trigger: 'manual', skipValidation: true }] satisfies NormalizedRegistryEntry
    }
    else if (typeof entry === 'object' && !Array.isArray(entry)) {
      const input: Record<string, unknown> = {}
      const scriptOptions: Record<string, unknown> = {}

      for (const [k, v] of Object.entries(entry)) {
        if (k === 'scriptOptions' || k === 'reverseProxyIntercept') {
          throw new TypeError(
            `[nuxt-scripts] registry.${key}.${k} is no longer supported.`,
          )
        }
        if ((SCRIPT_OPTION_KEYS as readonly string[]).includes(k))
          scriptOptions[k] = v
        else
          input[k] = v
      }

      registry[key] = Object.keys(scriptOptions).length > 0
        ? [input, scriptOptions]
        : [input]
    }
    else {
      throw new TypeError(
        `[nuxt-scripts] registry.${key}: invalid entry. Use a flat config object, 'mock', or false.`,
      )
    }
  }
}
