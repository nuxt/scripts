import NuxtScripts from '../modules/nuxt-scripts/src/module'
import NuxtThirdParty from '../modules/nuxt-third-party/src/module'
import NuxtAssets from '../modules/nuxt-assets/src/module'

export default defineNuxtConfig({
  modules: [
    NuxtScripts,
    NuxtThirdParty,
    NuxtAssets,
  ],
  devtools: { enabled: true },
  thirdParty: {
    globals: {
      fathomAnalytics: {
        site: 'FA12323',
      },
      // googleAnalytics: {
      //   id: 'GA23423434',
      // },
    },
  },
})
