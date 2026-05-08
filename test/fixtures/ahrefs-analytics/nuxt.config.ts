import { defineNuxtConfig } from 'nuxt/config'

// Bundled fixture (default `bundle: true`, so the script is served from
// /_scripts/assets/ after AST rewrite). The CDN fixture extends this one
// and overrides only the bundle setting + the page composable calls.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    defaultScriptOptions: { trigger: 'onNuxtReady' },
    registry: {
      ahrefsAnalytics: { key: 'test-ahrefs-key' },
    },
  },
  compatibilityDate: '2024-07-05',
})
