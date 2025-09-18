import { defineNuxtConfig } from 'nuxt/config'
import { createResolver } from '@nuxt/kit'

const { resolve } = createResolver(import.meta.url)

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],

  devtools: {
    enabled: true,
  },

  compatibilityDate: '2024-11-12',

  hooks: {
    'scripts:registry': function (registry) {
      registry.push({
        category: 'custom',
        label: 'My Custom Script',
        import: {
          name: 'useScriptMyCustomScript',
          from: resolve('./scripts/my-custom-script'),
        },
      })
    },
  },
})
