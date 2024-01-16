import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    setupFiles: ['./test/setup.ts'],
    environmentOptions: {
      nuxt: {
        overrides: {
          modules: ['@nuxt/scripts', '@nuxt/assets'],
        },
      },
    },
  },
})
