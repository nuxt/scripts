import { copyFile } from 'node:fs/promises'
import { builder } from '@nuxt/module-builder/tsdown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  hooks: {
    'build:prepare': () => copyFile(new URL('../../README.md', import.meta.url), new URL('./README.md', import.meta.url)),
  },
  plugins: [
    builder({
      entries: [
        './src/registry',
        './src/stats',
        './src/types-source',
      ],
      externals: [
        'nitropack',
        'h3',
        'vue-router',
        '@vue/runtime-core',
        '@unhead/schema',
        'knitwork',
        'esbuild',
        'unimport',
        '#nuxt-scripts/types',
        '#nuxt-scripts/utils',
        '@nuxt/devtools-kit',
      ],
    }),
  ],
})
