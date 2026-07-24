import { defineNuxtConfig } from 'nuxt/config'

// Minimal fixture for the proxy path alias feature (#814). Plausible is a clean
// single-domain (plausible.io) proxied script with an `autoInject` endpoint, so we
// can assert the alias is wired into both the injected config and the proxy handler.
export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],

  // Explicit object here ensures the auto-injected `endpoint` lands in public
  // runtime config (and is serialized to the client) so the test can read it.
  runtimeConfig: {
    public: {
      scripts: {
        plausibleAnalytics: { domain: 'example.com' },
      },
    },
  },

  scripts: {
    registry: {
      instagramEmbed: {},
      plausibleAnalytics: { domain: 'example.com' },
    },
    proxy: {
      alias: {
        'plausible.io': 'pl',
      },
    },
  },

  compatibilityDate: '2024-07-05',
})
