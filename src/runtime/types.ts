interface _ScriptOptions {
  async?: boolean
  defer?: boolean
  crossorigin?: boolean
  csp?: boolean
}
export type ScriptOptions = _ScriptOptions & ({ url: string} | { inlineScript: string })

export interface RenderResult {
  scripts: ScriptOptions[]
}

export interface ScriptProvider {
  /** rendering <head> metadata */
  render?: () => RenderResult
  /** runs once, on initial load */
  onLoad?: () => void
  /** hook for navigation */
  onNavigation?: () => void
}

export interface ScriptsContext {
  providers: ScriptProvider[]
  options: {
    debug: boolean
  }
}

export type ScriptProviderOptions = Record<string, any>
export type ScriptProviderDef<T extends ScriptProviderOptions = ScriptProviderOptions> = (options: T, context: ScriptsContext) => ScriptProvider

export function defineScriptProvider<T> (provider: ScriptProvider| ScriptProviderDef<T>): ScriptProviderDef<T> {
  if (provider instanceof Function) {
    return provider
  }
  return () => provider
}
