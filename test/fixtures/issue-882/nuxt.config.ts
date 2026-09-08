import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    assets: {
      fetchOptions: {
        onRequest({ request }) {
          throw new Error(`Unexpected script download: ${request}`)
        },
      },
    },
  },
  experimental: {
    componentIslands: {
      selectiveClient: true,
    },
  },
  compatibilityDate: '2024-07-05',
})
