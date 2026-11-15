import { defineNuxtConfig } from 'nuxt/config'

// Minimal fixture for the proxy path alias feature (#814). Plausible is a clean
// single-domain (plausible.io) proxied script with an `autoInject` endpoint, so we
// can assert the alias is wired into both the injected config and the proxy handler.
// `proxy.origin` moves client-facing proxy URLs to another host while the server
// route stays on the relative prefix.
export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],

  // Explicit object here ensures the auto-injected `endpoint` lands in public
  // runtime config (and is serialized to the client) so the test can read it.
  runtimeConfig: {
    public: {
      scripts: {
        plausibleAnalytics: { scriptId: 'test-script-id' },
      },
    },
  },

  scripts: {
    registry: {
      googleAnalytics: { id: 'G-TEST' },
      instagramEmbed: {},
      plausibleAnalytics: { scriptId: 'test-script-id' },
    },
    proxy: {
      origin: 'https://t.example.test',
      alias: {
        'plausible.io': 'pl',
      },
    },
  },

  compatibilityDate: '2024-07-05',
})
