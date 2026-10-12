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
      metaPixel: { id: '123456', trigger: false, bundle: false, scriptInput: { src: '/myScript.js' } },
    },
  },
  devtools: {
    enabled: true,
  },

  compatibilityDate: '2024-07-05',
})
