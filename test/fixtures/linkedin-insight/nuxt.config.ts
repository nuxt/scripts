import { defineNuxtConfig } from 'nuxt/config'

// Bundled fixture (default `bundle: true` from def(), so the script is
// served from /_scripts/assets/ after AST rewrite). The CDN fixture extends
// this one and overrides only the bundle setting + the page composable calls.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    defaultScriptOptions: { trigger: 'onNuxtReady' },
    registry: {
      linkedinInsight: { id: ['111143', '111154'], eventId: 'page-load-event-id-test', enableAutoSpaTracking: true },
    },
  },
  compatibilityDate: '2024-07-05',
})
