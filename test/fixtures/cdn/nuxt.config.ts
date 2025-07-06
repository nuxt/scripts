export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  app: {
    cdnURL: 'https://cdn.example.com',
  },
  scripts: {
    defaultScriptOptions: {
      bundle: true,
    },
  },
})
