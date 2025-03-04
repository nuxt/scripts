import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    globals: true,
    environmentOptions: {
      nuxt: {
        overrides: {
          modules: ['@nuxt/scripts'],
        },
      },
    },
  },
})
