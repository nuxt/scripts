import type { UseScriptReturn } from './types'

export function defineThirdParty<T>(preset: (options: T, ctx: { webworker: boolean; global: boolean }) => UseScriptReturn) {
  return preset
}
