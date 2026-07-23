import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig, defineProject } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    reporters: 'dot',
    projects: [
      // type tests using vitest typecheck
      defineProject({
        test: {
          name: 'typecheck',
          include: [
            './test/types/**/*.test-d.ts',
          ],
          typecheck: {
            enabled: true,
            include: ['./test/types/**/*.test-d.ts'],
          },
        },
      }),
      // utils folders as *.test.ts in either test/unit or in src/**/*.test.ts
      defineProject({
        resolve: {
          alias: {
            '@unhead/vue/scripts': new URL('./packages/script/node_modules/@unhead/vue/dist/scripts.mjs', import.meta.url).pathname,
            'unhead/scripts/triggers': new URL('./packages/script/node_modules/unhead/dist/scripts/triggers.mjs', import.meta.url).pathname,
            'unhead/scripts': new URL('./packages/script/node_modules/unhead/dist/scripts.mjs', import.meta.url).pathname,
            // Virtual emitted by the Nuxt module at build time; unit tests
            // mock it via `vi.mock('#build/nuxt-scripts-snippets')`, but the
            // import must first resolve to *something* the bundler accepts.
            // The alias points at an empty placeholder.
            '#build/nuxt-scripts-snippets': new URL('./test/unit/__mocks__/empty.ts', import.meta.url).pathname,
            '#build/nuxt-scripts-trigger-resolver': new URL('./test/unit/__mocks__/empty.ts', import.meta.url).pathname,
          },
        },
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            './**/*.test.ts',
          ],
          exclude: [
            './test/e2e/**/*.test.ts',
            './test/e2e-dev/**/*.test.ts',
            '**/*.nuxt.test.ts',
            '**/node_modules/**',
            '.claude/worktrees/**',
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
            './test/e2e-dev/**/*.test.ts',
            './test/unit/**/*.test.ts',
            '**/node_modules/**',
          ],
        },
      }),
      // e2e-dev: local-only e2e tests (excluded from CI)
      defineProject({
        test: {
          name: 'e2e-dev',
          include: [
            './test/e2e-dev/**/*.test.ts',
          ],
          exclude: [
            '**/node_modules/**',
          ],
        },
      }),
    ],
  },
})
