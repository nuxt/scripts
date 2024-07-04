import { defineNuxtConfig } from 'nuxt/config'
import { $fetch } from 'ofetch'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['@nuxt/ui-pro'],

  modules: [
    '@nuxt/fonts',
    '@nuxt/content',
    '@vueuse/nuxt',
    '@nuxt/scripts',
    '@nuxt/ui',
    // '@nuxthq/studio',
    '@nuxtjs/seo',
    '@nuxt/image',
    async (_, nuxt) => {
      // build time for caching
      const { contributors } = await $fetch(`https://api.nuxt.com/modules/scripts`)
      nuxt.options.runtimeConfig.public.contributors = contributors.map(m => m.id)
    },
  ],

  future: {
    compatibilityVersion: 4,
  },

  hooks: {
    // Define `@nuxt/ui` components as global to use them in `.md` (feel free to add those you need)
    'components:extend': (components) => {
      const globals = components.filter(c => ['UButton', 'UIcon', 'UAlert'].includes(c.pascalName))
      globals.forEach(c => c.global = true)
    },
  },

  $production: {
    scripts: {
      registry: {
        plausibleAnalytics: {
          domain: 'scripts.nuxt.com',
        },
      },
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
    url: 'scripts.nuxt.com',
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

  compatibilityDate: '2024-07-03',
})
