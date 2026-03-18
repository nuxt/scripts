export default defineNuxtConfig({
  modules: ['@nuxt/scripts', '@nuxt/ui'],

  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-01-01',

  scripts: {
    globals: {
      // Scripts defined here will use the consent trigger from app.vue
    },
  },
})
