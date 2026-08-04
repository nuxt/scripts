import { defineNuxtConfig } from 'nuxt/config'

// https://github.com/nuxt/scripts/issues/783
// Proxy URL signing (and the per-request page token) was removed. Static Maps
// now uses the public key directly, so the SSR payload is deterministic.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  devtools: { enabled: false },
  scripts: {
    registry: {
      googleMaps: { apiKey: 'test-key' },
    },
  },
  compatibilityDate: '2024-07-05',
})
