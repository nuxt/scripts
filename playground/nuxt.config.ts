import NuxtScripts from '../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtScripts,
    '@nuxt/ui',
  ],

  devtools: { enabled: true },
  compatibilityDate: '2024-07-14',

  nitro: {
    prerender: {
      failOnError: false,
    },
  },

  scripts: {
    debug: true,
  },
})
