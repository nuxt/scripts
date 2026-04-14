import type { ConsentScriptTriggerOptions } from '../types'
import { useScriptConsent } from './useScriptConsent'

/**
 * @deprecated Use `useScriptConsent` instead. `useScriptTriggerConsent` will be removed in the next major.
 * Migration: rename the function. All options are compatible. See https://scripts.nuxt.com/docs/guides/consent-mode
 */
export function useScriptTriggerConsent(options?: ConsentScriptTriggerOptions) {
  if (import.meta.dev) {
    console.warn('[nuxt-scripts] useScriptTriggerConsent is deprecated. Use useScriptConsent, same API, superset.')
  }
  return useScriptConsent(options)
}
