import { defineNuxtConfig } from 'nuxt/config'
import { $fetch } from 'ofetch'
import { isDevelopment } from 'std-env'
import NuxtScripts from '../src/module'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['@nuxt/ui-pro'],

  modules: [
    '@nuxt/fonts',
    '@nuxt/content',
    '@vueuse/nuxt',
    NuxtScripts,
    '@nuxt/ui',
    // '@nuxthq/studio',
    '@nuxtjs/seo',
    '@nuxt/image',
    async (_, nuxt) => {
      // build time for caching
      const { contributors } = await $fetch(`https://api.nuxt.com/modules/scripts`).catch(() => {
        if (isDevelopment) {
          return {
            contributors: [],
          }
        }
        throw new Error('Failed to fetch contributors')
      })
      nuxt.options.runtimeConfig.public.contributors = contributors.map(m => m.id)
    },
  ],

  $production: {
    scripts: {
      registry: {
        plausibleAnalytics: {
          domain: 'scripts.nuxt.com',
        },
      },
    },
  },

  devtools: {
    enabled: true,
  },

  app: {
    head: {
      seoMeta: {
        themeColor: [
          { content: '#18181b', media: '(prefers-color-scheme: dark)' },
          { content: 'white', media: '(prefers-color-scheme: light)' },
        ],
      },
      templateParams: {
        separator: '·',
      },
    },
  },

  site: {
    name: 'Nuxt Scripts',
    url: 'scripts.nuxt.com',
  },

  ui: {
    icons: ['heroicons', 'ph', 'simple-icons'],
  },

  build: {
    transpile: ['shiki'],
  },

  routeRules: {
    '/api/search.json': { prerender: true },
  },

  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: '2024-07-03',

  nitro: {
    prerender: {
      // For CF trailing slash issue
      autoSubfolderIndex: false,
    },
  },

  typescript: {
    strict: false,
  },

  hooks: {
    // Define `@nuxt/ui` components as global to use them in `.md` (feel free to add those you need)
    'components:extend': (components) => {
      const globals = components.filter(c => ['UButton', 'UIcon', 'UAlert'].includes(c.pascalName))
      globals.forEach(c => c.global = true)
    },
  },

  sitemap: {
    strictNuxtContentPaths: true,
  },
})
