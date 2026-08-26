import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    assets: {
      integrity: true,
    },
  },
  experimental: {
    componentIslands: {
      selectiveClient: true,
    },
  },
  compatibilityDate: '2024-07-05',
})
