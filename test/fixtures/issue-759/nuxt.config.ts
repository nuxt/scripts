import { defineNuxtConfig } from 'nuxt/config'

// Single build, multi-deployment: src is overridable via
// NUXT_PUBLIC_SCRIPTS_GLOBALS_TRUSTEDSHOPS_SRC at server start.
// https://github.com/nuxt/scripts/issues/759
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    globals: {
      trustedShops: [
        { src: 'https://widgets.trustedshops.com/build-default.js' },
        { trigger: 'onNuxtReady' },
      ],
    },
  },
  compatibilityDate: '2024-07-05',
})
