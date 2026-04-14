import { resolve } from 'pathe'

export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@nuxt/fonts',
    '@nuxt/ui',
    '@vueuse/nuxt',
  ],

  scripts: false,

  css: [resolve(__dirname, 'assets/css/global.css')],

  fonts: {
    families: [
      { name: 'Hubot Sans' },
    ],
  },

  imports: {
    autoImport: true,
  },

  devtools: {
    enabled: false,
  },

  compatibilityDate: '2026-03-13',

  nitro: {
    prerender: {
      routes: [
        '/',
        '/first-party',
        '/registry',
        '/docs',
      ],
    },
    output: {
      publicDir: resolve(__dirname, '../script/dist/devtools-client'),
    },
  },

  vite: {
    optimizeDeps: {
      include: [
        '@vueuse/core',
        '@nuxt/devtools-kit/iframe-client',
        'shiki/core',
        'shiki/engine/javascript',
        '@shikijs/langs/xml',
        '@shikijs/langs/json',
        '@shikijs/langs/js',
        '@shikijs/themes/vitesse-light',
        '@shikijs/themes/vitesse-dark',
        'valibot',
      ],
      exclude: ['jiti'],
    },
    resolve: {
      alias: {
        jiti: 'data:text/javascript,export default () => {}',
      },
    },
  },

  app: {
    baseURL: '/__nuxt-scripts',
  },
})
