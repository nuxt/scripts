import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    './src/registry',
    './src/stats',
  ],
  externals: [
    'nuxt',
    'nuxt/schema',
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
    '#nuxt-scripts-validator',
    'posthog-js',
    '#build/modules/nuxt-scripts-gtm',
    '#build/modules/nuxt-scripts-ga',
  ],
})
