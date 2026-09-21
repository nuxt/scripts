import type { TestOptions } from '@nuxt/test-utils/e2e'
import { setup } from '@nuxt/test-utils/e2e'
import { defu } from 'defu'

/**
 * Compile settings that a production build applies and a fixture build does not.
 *
 * `@nuxt/test-utils` builds fixtures inside the Vitest worker, where `NODE_ENV` is
 * `test`. `@vue/compiler-core` then loads its development build, and its
 * `comments` option defaults to `true`. A production build strips template
 * comments, so a bug that depends on a missing comment node cannot appear.
 *
 * `test/e2e/production-compile.test.ts` fails if this setting stops taking effect.
 */
export const productionCompileConfig = {
  vue: { compilerOptions: { comments: false } },
}

/**
 * Wraps `setup()` from `@nuxt/test-utils/e2e` so every e2e fixture compiles
 * templates like a production build. The production settings override the
 * caller's `nuxtConfig`.
 */
export function setupFixture(options: Partial<TestOptions>): Promise<void> {
  return setup({
    ...options,
    nuxtConfig: defu(productionCompileConfig, options.nuxtConfig),
  })
}
