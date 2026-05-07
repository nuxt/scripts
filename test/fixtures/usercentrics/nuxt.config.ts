import { defineNuxtConfig } from 'nuxt/config'

// Usercentrics fixture: bundle is intentionally off (see registry capabilities)
// so the loader is requested directly from app.usercentrics.eu.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    defaultScriptOptions: { trigger: 'onNuxtReady' },
    registry: {
      usercentrics: {
        // CI does not have a real Usercentrics account. The loader 4xx's on
        // unknown IDs but still injects with the right attributes, which is
        // what the wiring test asserts. Behavioural tests skip.
        settingsId: 'test-settings-id',
      },
    },
  },
  compatibilityDate: '2024-07-05',
})
