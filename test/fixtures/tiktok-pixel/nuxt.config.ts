import { defineNuxtConfig } from 'nuxt/config'

// Use the registry defaults so production tests catch bundled SDK regressions.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    defaultScriptOptions: { trigger: 'onNuxtReady' },
    registry: {
      tiktokPixel: { id: 'TEST_PIXEL_ID', defaultConsent: 'granted' },
    },
  },
  compatibilityDate: '2024-07-05',
})
