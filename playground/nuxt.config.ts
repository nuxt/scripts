export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
    'nuxt-scripts-devtools',
    '@nuxt/ui',
  ],
  devtools: { enabled: true },
  scripts: {
    register: {
      confetti: {
        version: 'latest',
      },
    },
    // TODO globals / register / overrides
  },
})
