/**
 * Mirrors unplugin's `StringFilter`. Declared here because `unplugin` is a dependency of
 * the module package, not of the test root.
 */
type FilterPattern = string | RegExp | Array<string | RegExp>
type StringFilter = FilterPattern | { include?: FilterPattern, exclude?: FilterPattern }

/**
 * Calling `plugin.transform.handler` directly skips the declared `transform.filter`,
 * so a filter that stops matching the files it should would fail no test. These helpers
 * apply the filter first, the way a bundler does.
 *
 * Semantics mirror unplugin's `createFilterForTransform`: a string pattern is a
 * substring test, a RegExp is `test()`, an array is OR, and any `exclude` match vetoes.
 */

function matches(pattern: string | RegExp, value: string): boolean {
  return typeof pattern === 'string' ? value.includes(pattern) : pattern.test(value)
}

function matchesFilter(filter: StringFilter | undefined, value: string): boolean {
  if (filter === undefined)
    return true
  if (typeof filter === 'string' || filter instanceof RegExp)
    return matches(filter, value)
  if (Array.isArray(filter))
    return filter.some(pattern => matches(pattern, value))

  const { include, exclude } = filter
  if (exclude !== undefined) {
    const excluded = Array.isArray(exclude)
      ? exclude.some(pattern => matches(pattern, value))
      : matches(exclude, value)
    if (excluded)
      return false
  }
  if (include === undefined)
    return true
  return Array.isArray(include)
    ? include.some(pattern => matches(pattern, value))
    : matches(include, value)
}

/** Would a bundler hand this module to the plugin's transform hook? */
export function transformAccepts(plugin: any, id: string, code: string): boolean {
  const filter = plugin.transform?.filter
  if (!filter)
    return true
  return matchesFilter(filter.id, id) && matchesFilter(filter.code, code)
}

/**
 * Run a transform the way a bundler would: filter, then handler.
 * Returns `undefined` when the filter rejects the module, matching a hook that never ran.
 */
export async function runTransform(
  plugin: any,
  { id, code, context = {} }: { id: string, code: string, context?: Record<string, unknown> },
): Promise<any> {
  if (!transformAccepts(plugin, id, code))
    return undefined
  const handler = plugin.transform?.handler ?? plugin.transform
  return handler.call(context, code, id)
}
