import {addComponent, addImports, addPluginTemplate, createResolver, defineNuxtModule} from '@nuxt/kit'
import type { FathomOptions } from './runtime/providers/fathomAnalytics'
import type { GoogleAnalyticsOptions } from './runtime/providers/googleAnalytics'

export interface ModuleOptions {
  globals?: {
    // global third parties
    fathomAnalytics?: FathomOptions
    googleAnalytics?: GoogleAnalyticsOptions
  }
}

const components = [
  'googleMapsEmbed',
  'youtubeEmbed',
]

const autoImports = [
  { from: 'googleAnalytics', name: 'useGoogleAnalytics' },
  { from: 'fathomAnalytics', name: 'useFathomAnalytics' },
]

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-third-party',
    configKey: 'thirdParty',
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // once published
    // await installModule('@nuxt/scripts')
    // await installModule('@nuxt/assets')

    const hasGlobals = Object.keys(options.globals).length > 1
    if (hasGlobals) {
      addPluginTemplate({
        filename: 'third-party.mjs',
        write: true,
        getContents() {
          const imports = ['import { defineNuxtPlugin } from "#imports";']
          const inits = []
          // for global scripts, we can initialise them script away
          for (const [k, config] of Object.entries(options.globals)) {
            // lazy module resolution
            // const importPath = relative(nuxt.options.srcDir, resolve(`./runtime/providers/${k}`))
            const importPath = resolve(`./runtime/providers/${k}`)
            // title case
            const exportName = k.substring(0, 1).toUpperCase() + k.substring(1)
            imports.unshift(`import { ${exportName} } from "${importPath}";`)
            inits.push(`${exportName}(${JSON.stringify(config)}, { global: true });`)
          }
          return [
            imports.join('\n'),
            '',
            'export default defineNuxtPlugin({',
            '  setup() {',
            inits.map(i => `    ${i}`).join('\n'),
            '  }',
            '})',
          ].join('\n')
        },
      })
    }
    // add auto-imports and components
    components.forEach((c) => {
      const exportName = c.substring(0, 1).toUpperCase() + c.substring(1)
      addComponent({
        filePath: resolve(`./runtime/providers/${c}`),
        name: exportName,
      })
    })
    autoImports.forEach((i) => {
      addImports({
        from: resolve(`./runtime/providers/${i.from}`),
        name: i.name,
      })
    })
  },
})
