import { resolve } from 'pathe'
import { DEVTOOLS_UI_ROUTE } from '../src/constants'

export default defineNuxtConfig({
  extends: ['nuxtseo-layer-devtools'],

  imports: {
    autoImport: true,
  },

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
      publicDir: resolve(__dirname, '../dist/devtools'),
    },
  },

  app: {
    baseURL: DEVTOOLS_UI_ROUTE,
  },
})
