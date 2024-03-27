import { addBuildPlugin, addImportsDir, addPlugin, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import { readPackageJSON } from 'pkg-types'
import type { NuxtUseScriptInput, NuxtUseScriptOptions } from './runtime/types'
import { setupDevToolsUI } from './devtools'
import { NuxtScriptAssetBundlerTransformer } from './plugins/transform'
import { setupPublicAssetStrategy } from './assets'
import { logger } from './logger'

export interface ModuleOptions {
  /**
   * Register scripts that should be loaded globally on all pages.
   */
  globals?: (NuxtUseScriptInput | [NuxtUseScriptInput, NuxtUseScriptOptions])[]
  /**
   * Override the static script options for specific scripts based on their provided `key` or `src`.
   */
  overrides?: {
    [key: string]: Pick<NuxtUseScriptOptions, 'assetStrategy'>
  }
  /** Configure the way scripts assets are exposed */
  assets?: {
    /**
     * The baseURL where scripts files are served.
     * @default '/_scripts/'
     */
    prefix?: string
    /** Currently scripts assets are exposed as public assets as part of the build. This will be configurable in future */
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
  'scripts:transform': (ctx: { script: string, options: any }) => Promise<void>
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
    enabled: true,
    debug: false,
  },
  async setup(config, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const { version } = await readPackageJSON(resolve('../package.json'))
    if (!config.enabled) {
      // TODO fallback to useHead
      logger.debug('The module is disabled, skipping setup.')
      return
    }
    // allow augmenting the options
    nuxt.options.alias['#nuxt-scripts'] = resolve('./runtime/types')
    nuxt.options.runtimeConfig['nuxt-scripts'] = { version }
    addImportsDir(resolve('./runtime/composables'))

    if (config.globals?.length) {
      // create a virtual plugin
      const template = addTemplate({
        filename: 'modules/nuxt-scripts/plugin.client.mjs',
        getContents() {
          return `import { defineNuxtPlugin, useScript } from '#imports'
export default defineNuxtPlugin({
  setup() {
${config.globals?.map(g => !Array.isArray(g)
            ? `    useScript("${g.toString()}")`
            : g.length === 2
              ? `    useScript(${JSON.stringify(g[0])}, ${JSON.stringify(g[1])} })`
              : `    useScript(${JSON.stringify(g[0])})`).join('\n')}
  }
})`
        },
      })
      addPlugin({
        src: template.dst,
        mode: 'client',
      })
    }

    const scriptMap = new Map<string, string>()
    const { normalizeScriptData } = setupPublicAssetStrategy(config.assets)

    addBuildPlugin(NuxtScriptAssetBundlerTransformer({
      overrides: config.overrides,
      resolveScript(src) {
        if (scriptMap.has(src))
          return scriptMap.get(src) as string
        const url = normalizeScriptData(src)
        scriptMap.set(src, url)
        return url
      },
    }))

    if (nuxt.options.dev)
      setupDevToolsUI(config, resolve)
  },
})
