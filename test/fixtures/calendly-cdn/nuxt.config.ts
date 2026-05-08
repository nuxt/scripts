import { defineNuxtConfig } from 'nuxt/config'

// Unbundled fixture: extends ../calendly (bundled) and adds `bundle: false`
// so the script loads directly from assets.calendly.com instead of from
// /_scripts/assets/. Inherits app.vue, package.json and pages from the parent.
export default defineNuxtConfig({
  extends: ['../calendly'],
  scripts: {
    defaultScriptOptions: { bundle: false },
    registry: {
      calendly: { scriptOptions: { bundle: false } },
    },
  },
})
