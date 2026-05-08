import { defineNuxtConfig } from 'nuxt/config'

// Unbundled fixture: extends ../ahrefs-analytics (bundled) and adds
// `bundle: false` so the script loads directly from analytics.ahrefs.com
// instead of /_scripts/assets/. Inherits app.vue, package.json, and
// pages/index.vue from the parent layer; overrides only the ahrefs page.
export default defineNuxtConfig({
  extends: ['../ahrefs-analytics'],
  scripts: {
    defaultScriptOptions: { bundle: false },
  },
})
