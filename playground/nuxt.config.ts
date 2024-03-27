export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
    'nuxt-scripts-devtools',
    '@nuxt/ui',
  ],
  devtools: { enabled: true },
  scripts: {
    globals: [
      'https://cdn.jsdelivr.net/npm/vue@3.2.20/dist/vue.global.prod.js',
    ],
    overrides: {
      'cloudflare-turnstile': {
        assetStrategy: 'bundle',
      },
    },
  },
})
