import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],
  // Log the mismatched node and both values, not only the summary line.
  debug: { hydration: true },
  compatibilityDate: '2024-07-05',
})
