import type {ComputedRef, Ref} from "vue";
import type { ScriptBase } from 'zhead'
import type { Script } from '@unhead/vue'
import {H3Event} from "h3";

export interface ScriptLoadContext {
  status: Ref<UseScriptStatus>
  error: Ref<string>
  requestEvent: H3Event
  loadPromise: Promise<void>
  mode: 'all' | 'client' | 'server'
}

export interface ScriptPreset {
  name: string
  transform: (script: ScriptBase, ctx: ScriptLoadContext) => Promise<void | false> | void | false
  setup?: (ctx: ScriptLoadContext) => void
}

export type UseScriptInput = { presets?: ScriptPreset[] } & Script

export type UseScriptStatus = 'awaitingLoad' | 'loading' | 'loaded' | 'error'

export interface UseScriptReturn {
  loaded: ComputedRef<boolean>
  status: Ref<UseScriptStatus>
  error: Ref<string>
}
