import type { ComputedRef, Ref } from 'vue'
import type { ScriptBase } from 'zhead'
import type { HeadEntryOptions, RuntimeMode, Script } from '@unhead/schema'

export interface UseScriptOptions<T> {
  key: Required<Script>['key']
  use: () => T | undefined | null
  assetStrategy?: 'proxy' | 'inline'
  loadStrategy?: 'idle' | Promise<void>
  transform?: (script: ScriptBase) => ScriptBase
  mode?: RuntimeMode
  script: Omit<Script, 'key'>
  scriptOptions?: Omit<HeadEntryOptions, 'mode'>
}

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error'

export interface ScriptInstance<T> {
  loaded: ComputedRef<boolean>
  status: Ref<UseScriptStatus>
  error: Ref<Error | null>
  use: () => T | undefined | null
  // only if success
  waitForLoad: () => Promise<T>
}
