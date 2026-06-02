import { defineNuxtConfig } from 'nuxt/config'

// Single build, multi-deployment: src is overridable via
// NUXT_PUBLIC_SCRIPTS_GLOBALS_TRUSTED_SHOPS_SRC at server start.
// https://github.com/nuxt/scripts/issues/759
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    globals: {
      trustedShops: [
        { src: 'https://widgets.trustedshops.com/build-default.js' },
        { trigger: 'onNuxtReady' },
      ],
      // Disabled per-instance via an empty `src` env override (no rebuild).
      awin: { src: 'https://www.dwin1.com/build-default.js' },
      // `src` rewritten at runtime by the scripts:globals hook (see plugins/globals.ts).
      scrads: [
        { src: 'https://scrads.example/baked.js' },
        { trigger: 'onNuxtReady' },
      ],
      // `delete`d at runtime by the scripts:globals hook; must not crash plugin setup.
      legacy: { src: 'https://legacy.example/baked.js' },
    },
  },
  compatibilityDate: '2024-07-05',
})
