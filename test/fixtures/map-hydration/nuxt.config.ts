import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    registry: {
      googleMaps: { trigger: false },
    },
  },
  compatibilityDate: '2024-07-05',
})
