import {defineNuxtModule, createResolver, addImports, addTypeTemplate, addServerHandler} from '@nuxt/kit'
import {relative} from "pathe";

// Module options TypeScript interface definition

interface GoogleAnalytics {
  googleAnalytics?: {
    id: string
  }
}

interface GoogleMapsEmbed {
  googleMapsEmbed?: {
    key: string
  }
}

interface GoogleTagManager {
  googleTagManager?: {
    id: string
  }
}

export interface ModuleOptions {
  globals?: GoogleAnalytics & GoogleMapsEmbed & GoogleTagManager & { [key: string]: Record<string, any> }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'scripts',
    configKey: 'scripts'
  },
  defaults: {},
  setup (options, nuxt) {
    const {resolve} = createResolver(import.meta.url)

    addImports({
      name: 'useScript',
      from: resolve('./runtime/composables/useScript')
    })
    addServerHandler({
      route: '/api/__nuxt_script__/proxy',
      // method: 'GET',
      handler: resolve('./runtime/server/api/proxy'),
    })
      addServerHandler({
          route: '/api/__nuxt_script__/inline',
          // method: 'GET',
          handler: resolve('./runtime/server/api/inline'),
      })

    nuxt.options.runtimeConfig['nuxt-script'] = {
      // default proxy scripts for 1 day
      proxyTtl: 60 * 60 * 24
    }

    const customScriptNames = Object.keys(options.global || {}).map(m => `'${m.name}'`).join(' | ')
    if (customScriptNames) {
      // extend types with global names
      addTypeTemplate({
        filename: 'types/nuxt-scripts.d.ts',
        getContents: () => {
          return `
// Augment the styles
declare module '${relative(resolve(nuxt.options.rootDir, nuxt.options.buildDir, 'types'), resolve('./runtime/types'))}' {
  type ScriptPresets = ${customScriptNames}
}
export {}
`
        }
      })
    }
  }
})
