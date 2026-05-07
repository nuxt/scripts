import { defineNuxtConfig } from 'nuxt/config'

// Unbundled fixture: extends ../linkedin-insight (bundled) and adds
// `bundle: false` so the script loads directly from snap.licdn.com instead
// of /_scripts/assets/. Inherits app.vue, package.json, and pages/index.vue
// from the parent layer; overrides only the LinkedIn page files.
export default defineNuxtConfig({
  extends: ['../linkedin-insight'],
  scripts: {
    defaultScriptOptions: { bundle: false },
  },
})
