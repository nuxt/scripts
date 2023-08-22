import type {ComputedRef, Ref} from "vue";
import type { ScriptBase } from 'zhead'
import type { Script, RuntimeMode } from '@unhead/schema'
import {H3Event} from "h3";

export interface ScriptLoadContext {
  status: Ref<UseScriptStatus>
  error: Ref<Error|null>
  requestEvent: H3Event | null
  loadPromise: Promise<void>
  mode: 'all' | 'client' | 'server'
}

export interface ScriptPreset {
  name: string
  transform?: (script: ScriptBase, ctx: ScriptLoadContext) => Promise<void | false> | void | false
  setup?: (ctx: ScriptLoadContext) => void
}

export type UseScriptInput = Script<{ presets?: ScriptPreset[], mode?: RuntimeMode }>

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error'

export interface UseScriptReturn {
  loaded: ComputedRef<boolean>
  status: Ref<UseScriptStatus>
  error: Ref<Error|null>
}
