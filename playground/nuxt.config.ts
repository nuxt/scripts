export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
    '@nuxt/ui',
  ],

  devtools: { enabled: true },
  compatibilityDate: '2024-07-14',

  scripts: {
    debug: true,
  },
})
