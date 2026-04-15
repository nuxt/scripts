import { useState } from 'nuxt/app'

export interface ScriptProxyToken {
  token: string
  ts: number
}

/**
 * Shared `useState` holding the proxy page token emitted during SSR.
 *
 * Populated by the `nuxt-scripts:proxy-token` server plugin when
 * `runtimeConfig['nuxt-scripts'].proxySecret` is set, and hydrated to the
 * client via the Nuxt payload. Stays null when signing is disabled.
 */
export function useScriptProxyToken() {
  return useState<ScriptProxyToken | null>('nuxt-scripts:proxy-token', () => null)
}
