import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    assets: {
      integrity: true,
      // The widget is only used through `nuxt-client` inside a server component, so the
      // client module graph shows no importer for it. Without this the client build
      // treats it as unused and it loads from the third-party origin.
      alwaysBundle: ['ScriptCalendlyInlineWidget'],
    },
  },
  experimental: {
    componentIslands: {
      selectiveClient: true,
    },
  },
  compatibilityDate: '2024-07-05',
})
