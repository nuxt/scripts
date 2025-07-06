import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig, defineProject } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      // utils folders as *.test.ts in either test/unit or in src/**/*.test.ts
      defineProject({
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            './**/*.test.ts',
          ],
          exclude: [
            './test/e2e/**/*.test.ts',
            '**/*.nuxt.test.ts',
            '**/node_modules/**',
          ],
        },
      }),
      // e2e tests in test/e2e
      defineProject({
        test: {
          name: 'e2e',
          include: [
            './test/e2e/**/*.test.ts',
          ],
          exclude: [
            '**/node_modules/**',
          ],
        },
      }),
      // nuxt tests in tests/nuxt-runtime OR *.nuxt.test.ts
      defineVitestProject({
        test: {
          name: 'nuxt-runtime',
          environment: 'nuxt',
          include: [
            './tests/nuxt-runtime/**/*.test.ts',
            './**/*.nuxt.test.ts',
          ],
          exclude: [
            // exclude other tests
            './test/e2e/**/*.test.ts',
            './test/unit/**/*.test.ts',
            '**/node_modules/**',
          ],
        },
      }),
    ],
  },
})
