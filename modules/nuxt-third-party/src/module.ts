import { addComponent, addImports, addPluginTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import {FathomOptions} from "./runtime/scripts/fathomAnalytics";
import {GoogleAnalyticsOptions} from "./runtime/scripts/googleAnalytics";
import {GoogleTagManagerOptions} from "./runtime/scripts/googleTagManager";

export interface ModuleOptions {
  globals?: {
    // global third parties
    fathomAnalytics?: FathomOptions
    googleAnalytics?: GoogleAnalyticsOptions
    googleTagManager?: GoogleTagManagerOptions
  }
}

const components = [
  'googleMapsEmbed',
  'youtubeEmbed',
]

const autoImports = [
  // captcha
  { from: 'cloudflareTurnstile', name: 'useCloudflareTurnstile' },
  // analytics
  { from: 'googleAnalytics', name: 'useGoogleAnalytics' },
  { from: 'fathomAnalytics', name: 'useFathomAnalytics' },
  { from: 'googleTagManager', name: 'useGoogleTagManager' },
]

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-third-party',
    configKey: 'thirdParty',
  },
  async setup(options) {
    const { resolve } = createResolver(import.meta.url)

    // once published
    // await installModule('@nuxt/scripts')
    // await installModule('@nuxt/assets')

    const hasGlobals = Object.keys(options.globals).length > 0
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
            const importPath = resolve(`./runtime/scripts/${k}`)
            // title case
            const exportName = k.substring(0, 1).toUpperCase() + k.substring(1)
            imports.unshift(`import { ${exportName} } from "${importPath}";`)
            inits.push(`${exportName}(${JSON.stringify(config)});`)
          }
          return [
            imports.join('\n'),
            '',
            'export default defineNuxtPlugin({',
            '  name: "nuxt-third-party",' +
            '  mode: "server",', // TODO support SPA
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
        filePath: resolve(`./runtime/components/${c}`),
        name: exportName,
        export: exportName,
      })
    })
    autoImports.forEach((i) => {
      addImports({
        from: resolve(`./runtime/scripts/${i.from}`),
        name: i.name,
      })
    })
  },
})
