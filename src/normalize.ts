/**
 * Normalize all registry config entries in-place to [input, scriptOptions?] tuple form.
 * Eliminates the 4-shape polymorphism (true | 'mock' | object | [object, options])
 * so all downstream consumers handle a single shape.
 *
 * - `true` → `[{}]`
 * - `'mock'` → `[{}, { trigger: 'manual', skipValidation: true }]`
 * - `{ id: '...' }` → `[{ id: '...' }]`
 * - `[{ id: '...' }, opts]` → unchanged
 * - falsy / empty array → deleted
 */
export function normalizeRegistryConfig(registry: Record<string, any>): void {
  for (const key of Object.keys(registry)) {
    const entry = registry[key]
    if (!entry) {
      delete registry[key]
      continue
    }
    if (entry === true) {
      registry[key] = [{}]
    }
    else if (entry === 'mock') {
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
      registry[key] = [entry]
    }
    else {
      delete registry[key]
    }
  }
}
