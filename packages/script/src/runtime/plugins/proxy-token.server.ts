import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { useScriptProxyToken } from '../composables/useScriptProxyToken'
import { generateProxyToken } from '../server/utils/sign'

/**
 * Emit a per-request proxy page token into the SSR payload.
 *
 * The token authorizes client-side proxy calls (`/embed/x-image?url=...`,
 * `/embed/bluesky?url=...`, etc.) without needing each URL to be signed
 * ahead of time. It stays null when no proxy secret is configured, in
 * which case `withSigning` passes requests through unchecked.
 */
export default defineNuxtPlugin({
  name: 'nuxt-scripts:proxy-token',
  enforce: 'pre',
  setup() {
    const secret = (useRuntimeConfig()['nuxt-scripts'] as { proxySecret?: string } | undefined)?.proxySecret
    if (!secret)
      return
    const ts = Math.floor(Date.now() / 1000)
    useScriptProxyToken().value = {
      token: generateProxyToken(secret, ts),
      ts,
    }
  },
})
