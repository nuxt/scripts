export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
    'nuxt-scripts-devtools',
    '@nuxt/ui',
  ],
  devtools: { enabled: true },
  scripts: {
    overrides: {
      'cloudflare-turnstile': {
        assetStrategy: 'bundle',
      },
    },
  },
})
