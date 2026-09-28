import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    registry: {
      statableAnalytics: { siteId: '123456', trigger: 'manual' },
    },
  },
  compatibilityDate: '2024-07-05',
})
