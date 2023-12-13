import NuxtScript from '../modules/nuxt-script/src/module'
import NuxtAssets from '../modules/nuxt-assets/src/module'
import NuxtScripts3p from '../modules/nuxt-third-parties/src/module'
import NuxtTPC from '../modules/nuxt-third-party-capital/src/module'

export default defineNuxtConfig({
  modules: [
    NuxtScript,
    NuxtScripts3p,
    NuxtAssets,
    NuxtTPC,
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
