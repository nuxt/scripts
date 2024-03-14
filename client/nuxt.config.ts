import { resolve } from 'pathe'
import DevtoolsUIKit from '@nuxt/devtools-ui-kit'

export default defineNuxtConfig({
  ssr: false,
  modules: [
    DevtoolsUIKit,
    'nuxt-icon',
  ],
  devtools: {
    enabled: false,
  },
  nitro: {
    output: {
      publicDir: resolve(__dirname, '../dist/client'),
    },
  },
  app: {
    baseURL: '/__nuxt-scripts',
  },
  experimental: {
    componentIslands: true,
  },
})
