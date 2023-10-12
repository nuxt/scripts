import { addComponent, addImports, addPluginTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import type { GoogleAnalyticsOptions } from './runtime/thirdParties/analytics/googleAnalytics'
import type { GoogleTagManagerOptions } from './runtime/thirdParties/googleTagManager'
import type { FathomAnalyticsOptions } from './runtime/thirdParties/analytics/fathomAnalytics'
import type { GoogleAdsenseOptions } from './runtime/thirdParties/ads/googleAdsense'
import type { CloudflareTurnstileOptions } from './runtime/thirdParties/captcha/cloudflareTurnstile'
import type { GoogleRecaptchaOptions } from './runtime/thirdParties/captcha/googleRecaptcha'
import type { JSConfettiOptions } from './runtime/thirdParties/fun/confetti'

export interface ModuleOptions {
  globals?: {
    // ads
    googleAdsense?: GoogleAdsenseOptions
    // analytics
    fathomAnalytics?: FathomAnalyticsOptions
    googleAnalytics?: GoogleAnalyticsOptions
    googleTagManager?: GoogleTagManagerOptions
    // captcha TODO need to think about how we handle server API keys / calls
    cloudflareTurnstile?: CloudflareTurnstileOptions
    googleRecaptcha?: GoogleRecaptchaOptions
    // fun
    confetti?: JSConfettiOptions
  }
}

// TODO maybe drop support
const components = [
  'googleMapsEmbed',
  'youtubeEmbed',
]

// TODO simplify this
const thirdParties = [
  // advertisement
  { from: 'ads/googleAdsense', name: 'useGoogleAdsense' },
  // captcha
  { from: 'captcha/cloudflareTurnstile', name: 'useCloudflareTurnstile' },
  { from: 'captcha/googleRecaptcha', name: 'useGoogleRecaptcha' },
  // analytics
  { from: 'analytics/googleAnalytics', name: 'useGoogleAnalytics' },
  { from: 'analytics/fathomAnalytics', name: 'useFathomAnalytics' },
  { from: 'analytics/cloudflareAnalytics', name: 'useCloudflareAnalytics' },
  // fun
  { from: 'fun/confetti', name: 'useConfetti' },
  // other
  { from: 'googleTagManager', name: 'useGoogleTagManager' },
]

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-scripts',
    configKey: 'scripts',
  },
  defaults: {},
  async setup(options) {
    const { resolve } = createResolver(import.meta.url)

    // TODO figure out worker support
    // await installModule('@nuxtjs/partytown')
    // adds third party specific globals and composables

    // nuxt-scripts is just a useScript and a bunch of transformers
    addImports({
      name: 'useScript',
      from: resolve('./runtime/composables/useScript'),
    })
    addImports({
      name: 'useAssetStrategyProxyUseScript',
      from: resolve('./runtime/composables/useAssetStrategyProxyUseScript'),
    })
    addImports({
      name: 'useAssetStrategyInlineUseScript',
      from: resolve('./runtime/composables/useAssetStrategyInlineUseScript'),
    })

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
    // add auto-imports and components
    components.forEach((c) => {
      const exportName = c.substring(0, 1).toUpperCase() + c.substring(1)
      addComponent({
        filePath: resolve(`./runtime/components/${c}`),
        name: exportName,
        export: exportName,
      })
    })
    thirdParties.forEach((i) => {
      addImports({
        from: resolve(`./runtime/thirdParties/${i.from}`),
        name: i.name,
      })
    })
  },
})
