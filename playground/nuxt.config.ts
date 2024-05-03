import { createResolver } from '@nuxt/kit'

const { resolve } = createResolver(import.meta.url)

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
    'nuxt-scripts-devtools',
    '@nuxt/ui',
  ],
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      scripts: {
        googleAnalytics: {
          id: '',
        },
      },
    },
  },
  hooks: {
    'scripts:registry': function (registry) {
      registry.push({
        category: 'custom',
        label: 'My Custom Script',
        import: {
          name: 'useScriptMyCustomScript',
          from: resolve('./scripts/myCustomScript'),
        },
      })
    },
  },
})
