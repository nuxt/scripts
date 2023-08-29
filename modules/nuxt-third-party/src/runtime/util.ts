import type { UseScriptReturn } from './types'

export function defineThirdParty<T>(thirdParty: { setup: (options: T, ctx: { webworker: boolean; global: boolean }) => UseScriptReturn }) {
  return thirdParty
}
