import type { ComputedRef, Ref } from 'vue'
import type { ScriptBase } from 'zhead'
import type { RuntimeMode, Script } from '@unhead/schema'
import type { H3Event } from 'h3'

export interface ScriptLoadContext {
  status: Ref<UseScriptStatus>
  error: Ref<Error | null>
  requestEvent: H3Event | null
  loadPromise: Promise<void>
  mode: 'all' | 'client' | 'server'
}

export interface ScriptTransform {
  name: string
  transform?: (script: ScriptBase, ctx: ScriptLoadContext) => Promise<void | false> | void | false
  setup?: (ctx: ScriptLoadContext) => void
}

export interface ScriptPresetOptions {
  name: string
  setup?: (ctx: ScriptLoadContext) => void
}

export interface ScriptContext {
  supportsWorkers: boolean
}

export type ScriptPreset = ScriptPresetOptions | ((ctx: ScriptContext) => ScriptPresetOptions)

export type UseScriptInput = Script<{ assetStrategy?: 'proxy' | 'inline'; loadStrategy?: 'idle'; transforms?: ScriptTransform[]; mode?: RuntimeMode }>

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error'

export interface UseScriptReturn {
  loaded: ComputedRef<boolean>
  status: Ref<UseScriptStatus>
  error: Ref<Error | null>
  waitForLoad: () => Promise<void>
}
