import { defineNuxtConfig } from 'nuxt/config'

// Regression fixture pinned to @unhead/vue@^3 via the
// `unhead-v3-fixture>@unhead/vue` override in pnpm-workspace.yaml.
// Module resolution picks v3 up through the fixture's own node_modules symlink.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  future: {
    compatibilityVersion: 5,
  },
  compatibilityDate: '2026-05-27',
})
