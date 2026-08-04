type ScriptApi = Record<string | symbol, any>

function walk(root: ScriptApi, path: Array<string | symbol>) {
  let owner: any
  let value: any = root
  for (const key of path) {
    if (value == null)
      return { owner: undefined, value: undefined }
    owner = value
    value = Reflect.get(value, key, value)
  }
  return { owner, value }
}

/**
 * Keeps Unhead's recording proxy while an SDK loads, then forwards calls to
 * the resolved SDK without discarding their return values.
 */
export function createNpmScriptProxy<T extends ScriptApi>(fallback: T, getApi: () => T | undefined): T {
  function node(path: Array<string | symbol>, fallbackValue: any): any {
    const children = new Map<string | symbol, any>()
    return new Proxy(() => {}, {
      get(_, property) {
        const api = getApi()
        let value: any
        if (api) {
          const current = walk(api, path).value
          value = current == null ? undefined : Reflect.get(current, property, current)
        }
        else {
          value = Reflect.get(fallbackValue, property, fallbackValue)
        }

        if (typeof value !== 'function')
          return value

        let child = children.get(property)
        if (!child) {
          child = node([...path, property], value)
          children.set(property, child)
        }
        return child
      },
      apply(_, thisArg, args) {
        const api = getApi()
        if (api) {
          const { owner, value } = walk(api, path)
          return Reflect.apply(value, owner, args)
        }
        return Reflect.apply(fallbackValue, thisArg, args)
      },
    })
  }

  return node([], fallback) as T
}
