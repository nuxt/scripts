import NuxtScripts from '../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtScripts,
    '@nuxt/ui',
  ],

  devtools: { enabled: true },

  nitro: {
    prerender: {
      failOnError: false,
    },
  },

  scripts: {
    debug: true,
  },
})
