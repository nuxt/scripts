import { copyFile } from 'node:fs/promises'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  hooks: {
    'build:before': async () => {
      await copyFile(new URL('../../README.md', import.meta.url), new URL('./README.md', import.meta.url))
    },
  },
  declaration: true,
  entries: [
    './src/registry',
    './src/stats',
    './src/types-source',
  ],
  externals: [
    'nuxt',
    'nuxt/schema',
    'nuxt/server',
    '@nuxt/kit',
    '@nuxt/schema',
    'nitropack',
    'nitropack/types',
    'h3',
    'vue',
    'vue-router',
    '@vue/runtime-core',
    '#imports',
    '@unhead/vue',
    '@unhead/schema',
    'knitwork',
    '@vimeo/player',
    'esbuild',
    'unimport',
    '#nuxt-scripts/types',
    '#nuxt-scripts/utils',
    'posthog-js',
    '#build/modules/nuxt-scripts-gtm',
    '#build/modules/nuxt-scripts-ga',
  ],
})
