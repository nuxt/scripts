import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    registry: {
      privatusAnalytics: { site: 'pa_test123', trigger: 'manual' },
    },
  },
  compatibilityDate: '2024-07-05',
})
