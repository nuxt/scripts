import { defineNuxtConfig } from 'nuxt/config'

// https://github.com/nuxt/scripts/issues/783
// Proxy URL signing (and the per-request page token) was removed. Proxy URLs
// are now plain, so the SSR payload is deterministic across requests.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  devtools: { enabled: false },
  scripts: {
    registry: {
      googleMaps: { apiKey: 'test-key' },
    },
    googleStaticMapsProxy: { enabled: true },
  },
  compatibilityDate: '2024-07-05',
})
