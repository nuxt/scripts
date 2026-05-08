import { defineNuxtConfig } from 'nuxt/config'

// Usercentrics fixture: bundle is intentionally off (see registry capabilities)
// so the loader is requested directly from web.cmp.usercentrics.eu.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    defaultScriptOptions: { trigger: 'onNuxtReady' },
    registry: {
      usercentrics: {
        rulesetId: 'test-ruleset-id',
      },
    },
  },
  compatibilityDate: '2024-07-05',
})
