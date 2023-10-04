import NuxtScripts from '../modules/nuxt-scripts/src/module'
import NuxtAssets from '../modules/nuxt-assets/src/module'

export default defineNuxtConfig({
  modules: [
    NuxtScripts,
    NuxtAssets,
    '@nuxt/ui',
    'nuxt-icon',
  ],
  devtools: { enabled: true },
  scripts: {
    globals: {
      // fathomAnalytics: {
      //   site: 'FA12323',
      // },
      // googleAnalytics: {
      //   id: 'GA23423434',
      // },
    },
  },
})
