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
  googleAnalytics: {
    id: 'GA-123456789-1',
  },
}

export default defineNuxtConfig({
  modules: [
    '@nuxt/scripts',
    'nuxt-scripts-devtools',
    '@nuxt/ui',
  ],
  devtools: { enabled: true },
  scripts: {
    register: scripts,
    // TODO globals / register / overrides
  },
  runtimeConfig: {
    public: {
      scripts: {
        googleTagManager: {
          id: 'GTM-MNJD4B',
        },
      },
    },
  },
  hooks: {
    'scripts:registry': function (registry) {
      registry.push({
        name: 'useScriptCustom',
        key: 'myCustomScript',
        from: resolve('./scripts/myCustomScript'),
      })
    },
  },
})
