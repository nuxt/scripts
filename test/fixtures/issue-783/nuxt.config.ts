import { defineNuxtConfig } from 'nuxt/config'

// https://github.com/nuxt/scripts/issues/783
// gravatar registers a signing-required proxy handler, so a proxy secret is
// resolved. `security.pageToken: false` must then keep the per-request token
// out of the SSR payload so the payload (and any response etag) is stable.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  // devtools injects a per-request `timeSsrStart` into the payload; disable it
  // so this fixture isolates the proxy token as the only payload variable.
  devtools: { enabled: false },
  scripts: {
    registry: {
      gravatar: true,
    },
    security: {
      secret: 'issue-783-test-secret',
      pageToken: false,
    },
  },
  compatibilityDate: '2024-07-05',
})
