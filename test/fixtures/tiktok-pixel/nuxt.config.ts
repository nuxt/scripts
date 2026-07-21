import { defineNuxtConfig } from 'nuxt/config'

// Unbundled fixture: the Pixel SDK loads directly from analytics.tiktok.com so
// the real `events.js` runs and we can assert it drains the array-protocol
// queue (the regression guarded by issue #785).
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
