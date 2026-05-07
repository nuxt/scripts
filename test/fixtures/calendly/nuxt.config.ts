import { defineNuxtConfig } from 'nuxt/config'

// Bundled fixture: the Calendly widget script is served from /_scripts/assets/.
// The CDN fixture extends this one and overrides only the bundle setting.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    defaultScriptOptions: { trigger: 'onNuxtReady' },
    registry: {
      calendly: true,
    },
  },
  compatibilityDate: '2024-07-05',
})
