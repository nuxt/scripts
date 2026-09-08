import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/scripts'],
  scripts: {
    assets: {
      integrity: true,
    },
  },
  experimental: {
    componentIslands: {
      selectiveClient: true,
    },
  },
  // Placeholder resolution rewrites emitted chunks, so build with client sourcemaps on
  // to prove the rewrite hands the bundler a usable map instead of stale offsets.
  sourcemap: {
    client: true,
  },
  compatibilityDate: '2024-07-05',
})
