import type { ConsentState, GcmConsentApi, UseScriptContext } from '../types'
import { safeParse } from 'valibot'
import { logger } from '../logger'
import { gcmConsentState } from './schemas'

export type { GcmConsentApi }

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
  const result = safeParse(gcmConsentState, state)
  if (result.success)
    return
  for (const issue of result.issues)
    log.warn(`${source}: ${issue.message} (path: ${issue.path?.map(p => p.key).join('.') || '<root>'})`)
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
