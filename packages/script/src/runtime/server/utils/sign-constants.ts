/**
 * Signing constants shared between server (HMAC) and client (page-token) code.
 *
 * Kept in a crypto-free module so client bundles can import the param names
 * without pulling in `node:crypto`.
 */

/** Query param name for the HMAC signature. */
export const SIG_PARAM = 'sig'

/** Length of the hex signature (16 chars = 64 bits). */
export const SIG_LENGTH = 16

/** Query param name for the page token. */
export const PAGE_TOKEN_PARAM = '_pt'

/** Query param name for the page token timestamp. */
export const PAGE_TOKEN_TS_PARAM = '_ts'

/** Default max age for page tokens in seconds (1 hour). */
export const PAGE_TOKEN_MAX_AGE = 3600
