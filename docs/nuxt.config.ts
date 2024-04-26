// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['@nuxt/ui-pro'],
  modules: [
    '@nuxt/fonts',
    '@nuxt/content',
    '@vueuse/nuxt',
    '@nuxt/ui',
    '@nuxthq/studio',
    '@nuxtjs/seo',
    '@nuxt/image',
  ],
  hooks: {
    // Define `@nuxt/ui` components as global to use them in `.md` (feel free to add those you need)
    'components:extend': (components) => {
      const globals = components.filter(c => ['UButton', 'UIcon'].includes(c.pascalName))

      globals.forEach(c => c.global = true)
    },
  },
  app: {
    seoMeta: {
      themeColor: [
        { content: '#18181b', media: '(prefers-color-scheme: dark)' },
        { content: 'white', media: '(prefers-color-scheme: light)' },
      ],
    },
    head: {
      templateParams: {
        separator: '·',
      },
    },
  },
  ui: {
    icons: ['heroicons', 'ph', 'simple-icons'],
  },
  routeRules: {
    '/api/search.json': { prerender: true },
  },
  site: {
    name: 'Nuxt Scripts',
    url: 'nuxt.scripts.com',
  },
  sitemap: {
    strictNuxtContentPaths: true,
  },
  nitro: {
    prerender: {
      // For CF trailing slash issue
      autoSubfolderIndex: false,
    },
  },
  devtools: {
    enabled: true,
  },
  typescript: {
    strict: false,
  },
})
