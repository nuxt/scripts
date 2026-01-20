import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/partytown',
    '@nuxt/scripts',
  ],

  compatibilityDate: '2024-07-05',

  partytown: {
    debug: true,
    forward: ['plausible'],
  },
})
