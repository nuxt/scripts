import {
  addBuildPlugin,
  addComponentsDir,
  addImports,
  addImportsDir,
  addPluginTemplate,
  createResolver,
  defineNuxtModule,
  hasNuxtModule,
} from '@nuxt/kit'
import { readPackageJSON } from 'pkg-types'
import type { FetchOptions } from 'ofetch'
import { setupDevToolsUI } from './devtools'
import { NuxtScriptBundleTransformer } from './plugins/transform'
import { setupPublicAssetStrategy } from './assets'
import { logger } from './logger'
import { extendTypes, installNuxtModule } from './kit'
import { registry } from './registry'
import type {
  NuxtConfigScriptRegistry,
  NuxtUseScriptInput,
  NuxtUseScriptOptionsSerializable,
  RegistryScript,
  RegistryScripts,
} from './runtime/types'
import { NuxtScriptsCheckScripts } from './plugins/check-scripts'
import { templatePlugin } from './templates'

export interface ModuleOptions {
  /**
   * The registry of supported third-party scripts. Loads the scripts in globally using the default script options.
   */
  registry?: NuxtConfigScriptRegistry
  /**
   * Default options for scripts.
   */
  defaultScriptOptions?: NuxtUseScriptOptionsSerializable
  /**
   * Register scripts that should be loaded globally on all pages.
   */
  globals?: Record<string, NuxtUseScriptInput | [NuxtUseScriptInput, NuxtUseScriptOptionsSerializable]>
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
    /**
     * Fallback to src if bundle fails to load.
     * The default behavior is to stop the bundling process if a script fails to be downloaded.
     * @default false
     */
    fallbackOnSrcOnBundleFail?: boolean
    /**
     * Configure the fetch options used for downloading scripts.
     */
    fetchOptions?: FetchOptions
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
  'scripts:registry': (registry: RegistryScripts) => void | Promise<void>
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxt/scripts',
    configKey: 'scripts',
    compatibility: {
      nuxt: '>=3.16',
      bridge: false,
    },
  },
  defaults: {
    defaultScriptOptions: {
      trigger: 'onNuxtReady',
    },
    assets: {
      fetchOptions: {
        retry: 3, // Specifies the number of retry attempts for failed fetches.
        retryDelay: 2000, // Specifies the delay (in milliseconds) between retry attempts.
        timeout: 15_000, // Configures the maximum time (in milliseconds) allowed for each fetch attempt.
      },
    },
    enabled: true,
    debug: false,
  },
  async setup(config, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const { version, name } = await readPackageJSON(resolve('../package.json'))
    nuxt.options.alias['#nuxt-scripts-validator'] = resolve(`./runtime/validation/${(nuxt.options.dev || nuxt.options._prepare) ? 'valibot' : 'mock'}`)
    nuxt.options.alias['#nuxt-scripts'] = resolve('./runtime')
    logger.level = (config.debug || nuxt.options.debug) ? 4 : 3
    if (!config.enabled) {
      // TODO fallback to useHead?
      logger.debug('The module is disabled, skipping setup.')
      return
    }
    // couldn't be found for some reason, assume compatibility
    const { version: unheadVersion } = await readPackageJSON('@unhead/vue', {
      from: nuxt.options.modulesDir,
    }).catch(() => ({ version: null }))
    if (unheadVersion?.startsWith('1')) {
      logger.error(`Nuxt Scripts requires Unhead >= 2, you are using v${unheadVersion}. Please run \`nuxi upgrade --clean\` to upgrade...`)
    }
    nuxt.options.runtimeConfig['nuxt-scripts'] = { version }
    nuxt.options.runtimeConfig.public['nuxt-scripts'] = {
      // expose for devtools
      version: nuxt.options.dev ? version : undefined,
      defaultScriptOptions: config.defaultScriptOptions,
    }
    addImportsDir([
      resolve('./runtime/composables'),
      // auto-imports aren't working without this for some reason
      // TODO find solution as we're double-registering
      resolve('./runtime/registry'),
    ])

    addComponentsDir({
      path: resolve('./runtime/components'),
    })

    const scripts = registry(resolve)
    nuxt.hooks.hook('modules:done', async () => {
      const registryScripts = [...scripts]

      // @ts-expect-error nuxi prepare is broken to generate these types, possibly because of the runtime path
      await nuxt.hooks.callHook('scripts:registry', registryScripts)
      const registryScriptsWithImport = registryScripts.filter(i => !!i.import?.name) as Required<RegistryScript>[]
      addImports(registryScriptsWithImport.map((i) => {
        return {
          priority: -1,
          ...i.import,
        }
      }))

      // compare the registryScripts to the original registry to find new scripts
      const newScripts = registryScriptsWithImport.filter(i => !scripts.some(r => r.import?.name === i.import.name))

      // augment types to support the integrations registry
      extendTypes(name!, async ({ typesPath }) => {
        let types = `
declare module '#app' {
  interface NuxtApp {
    $scripts: Record<${[...Object.keys(config.globals || {}), ...Object.keys(config.registry || {})].map(k => `'${k}'`).concat(['string']).join(' | ')}, (import('#nuxt-scripts/types').UseScriptContext<any>)>
    _scripts: Record<string, (import('#nuxt-scripts/types').UseScriptContext<any>)>
  }
  interface RuntimeNuxtHooks {
    'scripts:updated': (ctx: { scripts: Record<string, (import('#nuxt-scripts/types').UseScriptContext<any>)> }) => void | Promise<void>
  }
}
`
        if (newScripts.length) {
          types = `${types}
declare module '#nuxt-scripts/types' {
    type NuxtUseScriptOptions = Omit<import('${typesPath}').NuxtUseScriptOptions, 'use' | 'beforeInit'>
    interface ScriptRegistry {
${newScripts.map((i) => {
  const key = i.import?.name.replace('useScript', '')
  const keyLcFirst = key.substring(0, 1).toLowerCase() + key.substring(1)
  return `        ${keyLcFirst}?: import('${i.import?.from}').${key}Input | [import('${i.import?.from}').${key}Input, NuxtUseScriptOptions]`
}).join('\n')}
    }
}`
          return types
        }
        return types
      })

      if (Object.keys(config.globals || {}).length || Object.keys(config.registry || {}).length) {
        // create a virtual plugin
        addPluginTemplate({
          filename: `modules/${name!.replace('/', '-')}/plugin.mjs`,
          getContents() {
            return templatePlugin(config, registryScriptsWithImport)
          },
        })
      }
      const { renderedScript } = setupPublicAssetStrategy(config.assets)

      const moduleInstallPromises: Map<string, () => Promise<boolean> | undefined> = new Map()

      addBuildPlugin(NuxtScriptsCheckScripts(), {
        dev: true,
      })
      addBuildPlugin(NuxtScriptBundleTransformer({
        scripts: registryScriptsWithImport,
        defaultBundle: config.defaultScriptOptions?.bundle,
        moduleDetected(module) {
          if (nuxt.options.dev && module !== '@nuxt/scripts' && !moduleInstallPromises.has(module) && !hasNuxtModule(module))
            moduleInstallPromises.set(module, () => installNuxtModule(module))
        },
        assetsBaseURL: config.assets?.prefix,
        fallbackOnSrcOnBundleFail: config.assets?.fallbackOnSrcOnBundleFail,
        fetchOptions: config.assets?.fetchOptions,
        renderedScript,
      }))

      nuxt.hooks.hook('build:done', async () => {
        const initPromise = Array.from(moduleInstallPromises.values())
        for (const p of initPromise)
          await p?.()
      })
    })

    if (nuxt.options.dev)
      setupDevToolsUI(config, resolve)
  },
})
