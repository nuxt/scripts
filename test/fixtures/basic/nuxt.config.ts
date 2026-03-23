import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],
  scripts: {
    registry: {
      xEmbed: {},
      instagramEmbed: {},
      blueskyEmbed: {},
      gravatar: {},
    },
  },
  devtools: {
    enabled: true,
  },

  compatibilityDate: '2024-07-05',
})
