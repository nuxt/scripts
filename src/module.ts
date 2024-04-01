import { addBuildPlugin, addImports, addImportsDir, addPlugin, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import { readPackageJSON } from 'pkg-types'
import type { Import } from 'unimport'
import { joinURL, withBase, withQuery } from 'ufo'
import { setupDevToolsUI } from './devtools'
import { NuxtScriptAssetBundlerTransformer } from './plugins/transform'
import { setupPublicAssetStrategy } from './assets'
import { logger } from './logger'
import { extendTypes } from './kit'
import type { NuxtUseScriptInput, NuxtUseScriptOptions, ScriptRegistry } from '#nuxt-scripts'
import type { IntercomInput } from '~/src/runtime/registry/intercom'
import type { SegmentInput } from '~/src/runtime/registry/segment'
import type { HotjarInput } from '~/src/runtime/registry/hotjar'
import type { NpmInput } from '~/src/runtime/registry/npm'

export interface ModuleOptions {
  /**
   * Register scripts globally.
   */
  register?: ScriptRegistry
  /**
   * Default options for scripts.
   */
  defaultScriptOptions?: NuxtUseScriptOptions
  /**
   * Register scripts that should be loaded globally on all pages.
   */
  globals?: (NuxtUseScriptInput | [NuxtUseScriptInput, NuxtUseScriptOptions])[]
  /**
   * Override the static script options for specific scripts based on their provided `key` or `src`.
   */
  overrides?: Record<keyof ScriptRegistry, Pick<NuxtUseScriptOptions, 'assetStrategy'>>
  /** Configure the way scripts assets are exposed */
  assets?: {
    /**
     * The baseURL where scripts files are served.
     * @default '/_scripts/'
     */
    prefix?: string
    /**
     * Scripts assets are exposed as public assets as part of the build.
     *
     * TODO Make configurable in future.
     */
    strategy?: 'public'
  }
  /**
   * Whether the module is enabled.
   *
   * @default true
   */
  enabled: boolean
  /**
   * Enables debug mode.
   *
   * @false false
   */
  debug: boolean
}

export interface ModuleHooks {
  /**
   * Transform a script before it's registered.
   */
  'scripts:registry': (registry: Import[]) => Promise<void>
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxt/scripts',
    configKey: 'scripts',
    compatibility: {
      nuxt: '^3.11.1',
      bridge: false,
    },
  },
  defaults: {
    defaultScriptOptions: {
      assetStrategy: 'bundle', // Not supported on all scripts, only if the src is static, runtime fallback?
      trigger: 'onNuxtReady',
    },
    enabled: true,
    debug: false,
  },
  async setup(config, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const { version, name } = await readPackageJSON(resolve('../package.json'))
    if (!config.enabled) {
      // TODO fallback to useHead?
      logger.debug('The module is disabled, skipping setup.')
      return
    }
    // allow augmenting the options
    nuxt.options.alias['#nuxt-scripts'] = resolve('./runtime/types')
    nuxt.options.runtimeConfig['nuxt-scripts'] = { version }
    nuxt.options.runtimeConfig.public['nuxt-scripts'] = { defaultScriptOptions: config.defaultScriptOptions }
    addImportsDir([
      resolve('./runtime/composables'),
    ])

    nuxt.hooks.hook('modules:done', async () => {
      const registry: (Import & { transformSrc?: string })[] = [
        {
          name: 'useScriptCloudflareTurnstile',
          key: 'cloudflareTurnstile',
          from: resolve('./runtime/registry/cloudflare-turnstile'),
        },
        {
          name: 'useScriptCloudflareWebAnalytics',
          key: 'cloudflareWebAnalytics',
          from: resolve('./runtime/registry/cloudflare-web-analytics'),
          src: 'https://static.cloudflareinsights.com/beacon.min.js',
        },
        {
          name: 'useScriptConfetti',
          key: 'confetti',
          from: resolve('./runtime/registry/confetti'),
          src: 'https://unpkg.com/js-confetti@latest/dist/js-confetti.browser.js',
        },
        {
          name: 'useScriptFacebookPixel',
          key: 'facebookPixel',
          from: resolve('./runtime/registry/facebook-pixel'),
          src: 'https://connect.facebook.net/en_US/fbevents.js',
        },
        {
          name: 'useScriptFathomAnalytics',
          key: 'fathomAnalytics',
          from: resolve('./runtime/registry/fathom-analytics'),
          src: 'https://cdn.usefathom.com/script.js',
        },
        {
          name: 'useScriptGoogleAnalytics',
          key: 'googleAnalytics',
          from: resolve('./runtime/registry/google-analytics'),
        },
        {
          name: 'useScriptGoogleTagManager',
          key: 'googleTagmanager',
          from: resolve('./runtime/registry/google-tag-manager'),
        },
        {
          name: 'useScriptHotjar',
          from: resolve('./runtime/registry/hotjar'),
          key: 'hotjar',
          transform(options?: HotjarInput) {
            return withQuery(`https://static.hotjar.com/c/hotjar-${options?.id || ''}.js`, {
              sv: options?.sv || '6',
            })
          },
        },
        {
          name: 'useScriptIntercom',
          from: resolve('./runtime/registry/intercom'),
          key: 'intercom',
          transform(options?: IntercomInput) {
            return joinURL(`https://widget.intercom.io/widget`, options?.app_id || '')
          },
        },
        {
          name: 'useScriptSegment',
          from: resolve('./runtime/registry/segment'),
          key: 'segment',
          transform(options?: SegmentInput) {
            return joinURL('https://cdn.segment.com/analytics.js/v1', options?.writeKey || '', 'analytics.min.js')
          },
        },
        {
          name: 'useScriptNpm',
          // key is based on package name
          from: resolve('./runtime/registry/npm'),
          transform(options?: NpmInput) {
            return withBase(options?.file || '', `https://unpkg.com/${options?.packageName || ''}@${options?.version || 'latest'}`)
          },
        },
      ].map((i: Import) => {
        i.priority = -1
        return i
      })
      addImports(registry)

      // @ts-expect-error runtime
      await nuxt.hooks.callHook('scripts:registry', registry)

      if (config.globals?.length || Object.keys(config.register || {}).length) {
        // create a virtual plugin
        const template = addTemplate({
          filename: `modules/${name}.mjs`,
          write: true,
          getContents() {
            const imports = ['useScript', 'defineNuxtPlugin']
            const inits = []
            // for global scripts, we can initialise them script away
            for (const [k, c] of Object.entries(config.register || {})) {
              const importDefinition = registry.find(i => i.name === `useScript${k.substring(0, 1).toUpperCase() + k.substring(1)}`)
              if (importDefinition) {
                // title case
                imports.unshift(importDefinition.name)
                inits.push(`${importDefinition.name}(${JSON.stringify(c)});`)
              }
            }
            return `import { ${imports.join(', ')} } from '#imports'
export default defineNuxtPlugin({
  name: "${name}:init",
  setup() {
${(config.globals || []).map(g => !Array.isArray(g)
              ? `    useScript("${g.toString()}")`
              : g.length === 2
                ? `    useScript(${JSON.stringify(g[0])}, ${JSON.stringify(g[1])} })`
                : `    useScript(${JSON.stringify(g[0])})`).join('\n')}
    ${inits.join('\n    ')}
  }
})`
          },
        })
        addPlugin({
          src: template.dst,
        })
      }
      const scriptMap = new Map<string, string>()
      const { normalizeScriptData } = setupPublicAssetStrategy(config.assets)

      addBuildPlugin(NuxtScriptAssetBundlerTransformer({
        registry,
        defaultBundle: config.defaultScriptOptions?.assetStrategy === 'bundle',
        resolveScript(src) {
          if (scriptMap.has(src))
            return scriptMap.get(src) as string
          const url = normalizeScriptData(src)
          scriptMap.set(src, url)
          return url
        },
      }))
    })

    extendTypes(name!, async () => {
      return `
declare module '#app' {
    interface NuxtApp {
      ${nuxt.options.dev ? `_scripts: (import('#nuxt-scripts').NuxtAppScript)[]` : ''}
    }
}
`
    })

    if (nuxt.options.dev)
      setupDevToolsUI(config, resolve)
  },
})
