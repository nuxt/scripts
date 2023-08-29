import type { ScriptPreset, ScriptTransform, UseScriptReturn } from './types'

export function defineScriptTransform(transform: ScriptTransform) {
  return transform
}

export function defineScriptPreset(preset: ScriptPreset) {
  return preset
}

export interface ThirdParty<T> {
  key: string
  setup: (options: T, ctx: { webworker: boolean; global: boolean }) => UseScriptReturn
}

export function defineThirdParty<T>(preset: ThirdParty<T>) {
  return preset
}
