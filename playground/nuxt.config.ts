import NuxtScripts from '../modules/nuxt-scripts/src/module'
import NuxtAssets from '../modules/nuxt-assets/src/module'
import NuxtThirdParty from '../modules/nuxt-third-party/src/module'

export default defineNuxtConfig({
  modules: [
    NuxtScripts,
    NuxtAssets,
    NuxtThirdParty,
  ],
  devtools: { enabled: true },
  thirdParty: {
    globals: {
      fathomAnalytics: {
        site: 'FA12323',
      },
      googleAnalytics: {
        id: 'GA23423434',
      },
    },
  },
})
