import { createResolver } from '@nuxt/kit'
import { DEVTOOLS_UI_ROUTE } from '../src/constants'

const resolver = createResolver(import.meta.url)

export default defineNuxtConfig({

  modules: [
    '@nuxt/devtools-ui-kit',
  ],
  ssr: false,
  devtools: { enabled: false },
  app: {
    baseURL: DEVTOOLS_UI_ROUTE,
  },

  compatibilityDate: '2024-07-04',
  nitro: {
    output: {
      publicDir: resolver.resolve('../dist/client'),
    },
  },
})
