import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],
  scripts: {
    registry: {
      speedcurve: {},
    },
  },
  compatibilityDate: '2024-07-05',
})
