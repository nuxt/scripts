type ScriptApi = Record<PropertyKey, any>

function bindMethod(owner: ScriptApi, method: (...args: any[]) => any): (...args: any[]) => any {
  const wrapped: (...args: any[]) => any = new Proxy(method, {
    apply(target, _receiver, args) {
      return Reflect.apply(target, owner, args)
    },
    construct(target, args, newTarget): object {
      return Reflect.construct(target, args, newTarget === wrapped ? target : newTarget)
    },
    get(target, property) {
      return Reflect.get(target, property, target)
    },
    set(target, property, value) {
      return Reflect.set(target, property, value, target)
    },
  })
  return wrapped
}

/**
 * Keep vendor methods attached to the object returned by `use()`.
 *
 * Unhead's loaded script proxy forwards methods with the forwarding proxy as
 * `this`. Vendor methods can then reach recursively proxied platform objects,
 * which fail native brand checks such as Firefox's Element checks. Returning
 * stable method wrappers preserves the vendor API as the receiver while
 * retaining queued proxy calls and constructable function properties.
 */
export function bindScriptApiMethods<T>(api: T): T {
  if ((typeof api !== 'object' && typeof api !== 'function') || api === null)
    return api

  const target = api as ScriptApi
  const methods = new Map<PropertyKey, { method: (...args: any[]) => any, wrapped: (...args: any[]) => any }>()

  return new Proxy(target, {
    get(innerTarget, property) {
      const value = Reflect.get(innerTarget, property, innerTarget)
      if (typeof value !== 'function')
        return value

      const cached = methods.get(property)
      if (cached && cached.method === value)
        return cached.wrapped

      const wrapped = bindMethod(innerTarget, value)
      methods.set(property, { method: value, wrapped })
      return wrapped
    },
    set(innerTarget, property, value) {
      methods.delete(property)
      return Reflect.set(innerTarget, property, value, innerTarget)
    },
  }) as T
}

export function bindScriptApiResolver<T>(resolve: () => T | Promise<T>): () => T | Promise<T> {
  return () => {
    const result = resolve()
    const isPromise = result instanceof Promise
      || Object.prototype.toString.call(result) === '[object Promise]'
    return isPromise
      ? (result as Promise<T>).then(bindScriptApiMethods)
      : bindScriptApiMethods(result)
  }
}
