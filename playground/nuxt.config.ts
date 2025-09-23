import NuxtScripts from '../src/module'
import { createResolver } from '@nuxt/kit'

const { resolve } = createResolver(import.meta.url)

export default defineNuxtConfig({
  modules: [
    NuxtScripts,
    '@nuxt/ui',
  ],

  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  nitro: {
    prerender: {
      failOnError: false,
    },
  },

  scripts: {
    debug: true,
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
})
