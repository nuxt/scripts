import { createResolver } from '@nuxt/kit'
import type { ScriptRegistry } from '#nuxt-scripts'

const { resolve } = createResolver(import.meta.url)

const scripts: ScriptRegistry = {
  myCustomScript: [
    {
      id: '123',
    },
    {
      assetStrategy: 'bundle',
    },
  ],
  confetti: {
    version: 'latest',
  },
  googleAnalytics: true,
}

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
    'nuxt-scripts-devtools',
    '@nuxt/ui',
  ],
  devtools: { enabled: true },
  scripts: {
    registry: scripts,
    // TODO globals
  },
  runtimeConfig: {
    public: {
      scripts: {
        googleAnalytics: {
          id: '',
        },
      },
    },
  },
  hooks: {
    'scripts:registry': function (registry) {
      registry.push({
        category: 'custom',
        label: 'My Custom Script',
        import: {
          name: 'useScriptMyCustomScript',
          from: resolve('./scripts/myCustomScript'),
        },
      })
    },
  },
})
