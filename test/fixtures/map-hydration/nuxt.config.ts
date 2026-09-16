import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
  ],
  scripts: {
    registry: {
      // No page loads a map SDK. Hydration compares the server HTML with the
      // client's first render, which happens before any script loads.
      maplibre: { trigger: false },
      leaflet: { trigger: false, bundle: false },
      googleMaps: { trigger: false },
    },
  },
  compatibilityDate: '2024-07-05',
})
