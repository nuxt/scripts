import type { ConsentState, GcmConsentApi, UseScriptContext } from '../types'
import { logger } from '../logger'

export type { GcmConsentApi }

// GCMv2 consent categories. Every entry takes `granted` or `denied`.
const CONSENT_CATEGORIES = [
  'ad_storage',
  'ad_user_data',
  'ad_personalization',
  'analytics_storage',
  'functionality_storage',
  'personalization_storage',
  'security_storage',
] as const satisfies readonly (keyof ConsentState)[]

const CONSENT_CATEGORY_KEYS: ReadonlySet<string> = new Set(CONSENT_CATEGORIES)

// Fails to compile if `ConsentState` grows a key this validator does not know about.
type AssertNever<T extends never> = T
type _ConsentKeysChecked = AssertNever<Exclude<keyof ConsentState, typeof CONSENT_CATEGORIES[number] | 'wait_for_update' | 'region'>>

/**
 * Describe what is wrong with one consent entry, or return `null` when it is valid.
 * The canonical schema stays lenient so unknown keys pass a schema parse; here we
 * reject them, because an unknown key is almost always a typo the user wants to see.
 */
function describeConsentIssue(key: string, value: unknown): string | null {
  if (CONSENT_CATEGORY_KEYS.has(key)) {
    return value === 'granted' || value === 'denied'
      ? null
      : `"${key}" must be "granted" or "denied", received ${JSON.stringify(value)}`
  }
  if (key === 'wait_for_update') {
    return typeof value === 'number' && Number.isFinite(value)
      ? null
      : `"wait_for_update" must be a number, received ${JSON.stringify(value)}`
  }
  if (key === 'region') {
    return Array.isArray(value) && value.every(entry => typeof entry === 'string')
      ? null
      : `"region" must be an array of strings, received ${JSON.stringify(value)}`
  }
  return `unknown key "${key}"`
}

/**
 * GCMv2 consent contract returned by registry scripts (GA, GTM, future Google Ads, …).
 * `useRegistryScript` wires the `consent.default/update` API when present.
 */
export interface GcmConsentContract {
  /** Forward a `consent`,`<action>`, `<state>` call to the script's transport (dataLayer or gtag). */
  push: (proxy: any, action: 'default' | 'update', state: ConsentState) => void
}

/** Validate a partial GCMv2 consent state. Logs each issue via the registry-scoped logger. */
export function validateConsentState(log: typeof logger, state: ConsentState, source: string) {
  if (state === null || typeof state !== 'object') {
    log.warn(`${source}: consent state must be an object, received ${JSON.stringify(state)}`)
    return
  }
  for (const key in state) {
    const issue = describeConsentIssue(key, (state as Record<string, unknown>)[key])
    if (issue)
      log.warn(`${source}: ${issue}`)
  }
}

export function attachGcmConsent(
  instance: UseScriptContext<any, GcmConsentApi>,
  contract: GcmConsentContract,
  registryKey: string,
) {
  if (instance.consent)
    return
  const log = logger.withTag(registryKey)
  const push = (action: 'default' | 'update', state: ConsentState) => {
    validateConsentState(log, state, `consent.${action}()`)
    contract.push(instance.proxy, action, state)
  }
  instance.consent = {
    default: (state: ConsentState) => push('default', state),
    update: (state: ConsentState) => push('update', state),
  }
}
