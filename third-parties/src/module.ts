import { addImportsDir, addPluginTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import type { FathomAnalyticsOptions } from './runtime/composables/fathomAnalytics'
import type { GoogleAdsenseOptions } from './runtime/composables/googleAdsense'
import type { CloudflareTurnstileOptions } from './runtime/composables/cloudflareTurnstile'
import type { GoogleRecaptchaOptions } from './runtime/composables/googleRecaptcha'
import type { JSConfettiOptions } from './runtime/composables/confetti'

export interface ModuleOptions {
  globals?: {
    // ads
    googleAdsense?: GoogleAdsenseOptions
    // analytics
    fathomAnalytics?: FathomAnalyticsOptions
    cloudflareTurnstile?: CloudflareTurnstileOptions
    googleRecaptcha?: GoogleRecaptchaOptions
    // fun
    confetti?: JSConfettiOptions
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxt/third-parties',
    configKey: 'thirdParties',
  },
  defaults: {},
  async setup(options) {
    const { resolve } = createResolver(import.meta.url)

    const hasGlobals = Object.keys(options.globals || {}).length > 0
    if (hasGlobals) {
      addPluginTemplate({
        filename: 'third-party.mjs',
        write: true,
        getContents() {
          const imports = ['import { defineNuxtPlugin } from "#imports";']
          const inits = []
          // for global scripts, we can initialise them script away
          for (const [k, config] of Object.entries(options.globals || {})) {
            // lazy module resolution
            const importPath = resolve(`./runtime/composables/${k}`)
            // title case
            const exportName = k.substring(0, 1).toUpperCase() + k.substring(1)
            imports.unshift(`import { ${exportName} } from "${importPath}";`)
            inits.push(`${exportName}(${JSON.stringify(config)});`)
          }
          return [
            imports.join('\n'),
            '',
            'export default defineNuxtPlugin({',
            '  name: "nuxt-third-party",'
            + '  mode: "server",', // TODO support SPA?
            '  setup() {',
            inits.map(i => `    ${i}`).join('\n'),
            '  }',
            '})',
          ].join('\n')
        },
      })
    }
    addImportsDir(resolve('./runtime/composables'))
  },
})
