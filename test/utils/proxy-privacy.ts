/**
 * Legacy name for the same function, preserved for test compatibility.
 */
import { stripPayloadFingerprinting } from '../../src/runtime/server/utils/privacy'

export * from '../../src/runtime/server/utils/privacy'
export const stripFingerprintingFromPayload = stripPayloadFingerprinting

/**
 * Parameters that are OK to forward.
 * (Defined in tests to verify what stays in)
 */
export const ALLOWED_PARAMS = {
  // Page context (needed for analytics)
  page: ['dt', 'dl', 'dr', 'de'], // title, location, referrer, encoding

  // Event data
  event: ['en', 'ep', 'ev', 'ec', 'ea', 'el'], // event name, params, value, category, action, label

  // Timestamps
  time: ['z', '_s', 'timestamp'],
}
