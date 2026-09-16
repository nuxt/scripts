import { defineNuxtConfig } from 'nuxt/config'

// Bundled fixture (default `bundle: true` from def(), so the script is
// served from /_scripts/assets/ after AST rewrite). The CDN fixture extends
// this one and overrides only the bundle setting + the page composable calls.
export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  app: {
    head: {
      script: [
        {
          // The native requestIdleCallback can starve on a busy CI runner.
          // Then onNuxtReady fires late, and the e2e script-tag wait times out.
          // Install Nuxt's own setTimeout fallback eagerly, so the onNuxtReady
          // trigger stays deterministic. Runs before the deferred app bundle,
          // so Nuxt's idle-callback compat picks it up.
          innerHTML: `window.requestIdleCallback = function (cb) {
            const start = Date.now()
            return setTimeout(function () {
              cb({ didTimeout: false, timeRemaining: function () { return Math.max(0, 50 - (Date.now() - start)) } })
            }, 1)
          }`,
        },
      ],
    },
  },
  scripts: {
    defaultScriptOptions: { trigger: 'onNuxtReady' },
    registry: {
      linkedinInsight: { id: ['111143', '111154'], eventId: 'page-load-event-id-test', enableAutoSpaTracking: true },
    },
  },
  compatibilityDate: '2024-07-05',
})
