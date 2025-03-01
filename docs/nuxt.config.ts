import { defineNuxtConfig } from 'nuxt/config'
import { $fetch } from 'ofetch'
import { isDevelopment } from 'std-env'
import NuxtScripts from '../src/module'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  extends: ['@nuxt/ui-pro'],

  modules: [
    '@nuxt/fonts',
    '@vueuse/nuxt',
    NuxtScripts,
    '@nuxt/ui',
    '@nuxtjs/seo',
    '@nuxt/image',
    'nuxt-content-twoslash',
    '@nuxt/content',
    'nuxt-llms',
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
    routeRules: {
      '/api/_mdc/highlight': { cache: { group: 'mdc', name: 'highlight', maxAge: 60 * 60 } },
      '/api/_content/query/**': { cache: { group: 'content', name: 'query', maxAge: 60 * 60 } },
      '/api/_nuxt_icon': { cache: { group: 'icon', name: 'icon', maxAge: 60 * 60 * 24 * 7 } },
    },
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
      templateParams: {
        separator: '·',
      },
    },
  },

  site: {
    name: 'Nuxt Scripts',
    url: 'scripts.nuxt.com',
    description: 'Nuxt Scripts lets you load third-party scripts with better performance, privacy, security and DX. It includes many popular third-parties out of the box.',
  },

  content: {
    build: {
      markdown: {
        highlight: {
          theme: {
            light: 'github-light',
            default: 'github-light',
            dark: 'material-theme-palenight',
          },
          langs: [
            'ts',
            'tsx',
            'vue',
            'json',
            'html',
            'bash',
            'xml',
            'diff',
            'md',
            'dotenv',
          ],
        },
      },
    },
  },

  ui: {
    icons: ['heroicons', 'ph', 'simple-icons'],
  },

  build: {
    transpile: ['shiki'],
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

  hooks: {
    // Define `@nuxt/ui` components as global to use them in `.md` (feel free to add those you need)
    'components:extend': (components) => {
      const globals = components.filter(c => ['UButton', 'UIcon', 'UAlert'].includes(c.pascalName) || c.pascalName.includes('Prose'))
      globals.forEach(c => c.global = true)
    },
  },

  icon: {
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
    },
    provider: 'iconify',
  },

  llms: {
    domain: 'https://scripts.nuxt.com',
    title: 'Nuxt Scripts',
    description: 'Nuxt Scripts lets you load third-party scripts with better performance, privacy, security and DX. It includes many popular third-parties out of the box.',
    notes: [
      'The documentation only includes Nuxt Content v3 docs.',
      'The content is automatically generated from the same source as the official documentation.',
    ],
    full: {
      title: 'Complete Documentation',
      description: 'The complete documentation including all content',
    },
  },

  ogImage: {
    zeroRuntime: true,
  },

  seo: {
    meta: {
      themeColor: [
        { content: '#18181b', media: '(prefers-color-scheme: dark)' },
        { content: 'white', media: '(prefers-color-scheme: light)' },
      ],
    },
  },

  uiPro: {
    license: process.env.NUXT_UI_PRO_LICENSE,
  },
})
