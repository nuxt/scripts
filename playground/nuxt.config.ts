export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
    '@nuxt/assets',
    '@nuxt/third-parties',
    '@nuxt/third-party-capital',
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
