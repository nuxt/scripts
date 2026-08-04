type NpmScriptApiState<T>
  = | { _tag: 'Preload' }
    | { _tag: 'Loaded', api: T }

export function createNpmScriptApiState<T>(resolvePreload?: () => T | undefined) {
  let state: NpmScriptApiState<T> = { _tag: 'Preload' }

  return {
    current(): T | undefined {
      return state._tag === 'Loaded' ? state.api : resolvePreload?.()
    },
    async load(resolveLoaded?: () => T | Promise<T> | undefined, initialized?: T): Promise<T> {
      const api = await Promise.resolve(resolveLoaded?.() || initialized || {} as T)
      state = { _tag: 'Loaded', api }
      return api
    },
  }
}
