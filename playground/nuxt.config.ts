import NuxtScripts from '../src/module'
import { createResolver } from '@nuxt/kit'

const { resolve } = createResolver(import.meta.url)

export default defineNuxtConfig({
  modules: [
    NuxtScripts,
    '@nuxt/ui',
  ],

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      scripts: {
        googleSignIn: {
          clientId: '', // NUXT_PUBLIC_SCRIPTS_GOOGLE_SIGN_IN_CLIENT_ID
        },
      },
    },
  },

  nitro: {
    prerender: {
      failOnError: false,
    },
  },

  hooks: {
    'scripts:registry': function (registry) {
      registry.push({
        category: 'custom',
        label: 'My Custom Script',
        src: '/mock-custom-script.js',
        import: {
          name: 'useScriptMyCustomScript',
          from: resolve('./scripts/myCustomScript'),
        },
      })
    },
  },

  scripts: {
    debug: true,
    registry: {
      googleSignIn: true,
    },
  },
})
