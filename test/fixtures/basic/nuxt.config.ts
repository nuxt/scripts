import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],
  scripts: {
    registry: {
      xEmbed: true,
      instagramEmbed: true,
      blueskyEmbed: true,
    },
  },
  devtools: {
    enabled: true,
  },

  compatibilityDate: '2024-07-05',
})
