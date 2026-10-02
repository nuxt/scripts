import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/partytown',
    '@nuxt/scripts',
  ],

  scripts: {
    registry: {
      googleAnalytics: { id: 'G-TEST', trigger: false, scriptInput: { src: 'https://www.googletagmanager.com/gtag/js?id=G-TEST' } },
      tiktokPixel: { id: 'TEST_PIXEL_ID', partytown: true, trigger: false },
    },
  },

  compatibilityDate: '2024-07-05',

  partytown: {
    debug: true,
  },
})
