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
import { lt } from 'semver'
import { resolvePath } from 'mlly'
import { join } from 'pathe'
import { setupDevToolsUI } from './devtools'
import { NuxtScriptAssetBundlerTransformer } from './plugins/transform'
import { setupPublicAssetStrategy } from './assets'
import { logger } from './logger'
import { extendTypes, installNuxtModule } from './kit'
import { registry } from './registry'
import type { NuxtUseScriptInput, NuxtUseScriptOptions, RegistryScripts, ScriptRegistry } from '#nuxt-scripts'

export interface ModuleOptions {
  /**
   * The registry of supported third-party scripts. Loads the scripts in globally using the default script options.
   */
  registry?: ScriptRegistry
  /**
   * Default options for scripts.
   */
  defaultScriptOptions?: NuxtUseScriptOptions
  /**
   * Register scripts that should be loaded globally on all pages.
   */
  globals?: (NuxtUseScriptInput | [NuxtUseScriptInput, NuxtUseScriptOptions])[]
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
  'scripts:registry': (registry: RegistryScripts) => void | Promise<void>
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxt/scripts',
    configKey: 'scripts',
    compatibility: {
      nuxt: '>=3',
      bridge: false,
    },
  },
  defaults: {
    defaultScriptOptions: {
      trigger: 'onNuxtReady',
    },
    enabled: true,
    debug: false,
  },
  async setup(config, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    const { version, name } = await readPackageJSON(resolve('../package.json'))
    const { version: unheadVersion } = await readPackageJSON(join(await resolvePath('@unhead/vue'), 'package.json'))

    if (!unheadVersion || lt(unheadVersion, '1.8.0')) {
      logger.warn('@nuxt/scripts requires @unhead/vue >= 1.8.0, please upgrade to use the module.')
      return
    }
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

    addComponentsDir({
      path: resolve('./runtime/components'),
    })

    const scripts = registry(resolve)
    nuxt.hooks.hook('modules:done', async () => {
      const registryScripts = [...scripts]
      // @ts-expect-error runtime
      await nuxt.hooks.callHook('scripts:registry', registryScripts)
      addImports(registryScripts.map((i) => {
        return {
          priority: -1,
          ...i.import,
        }
      }))

      // compare the registryScripts to the original registry to find new scripts
      const newScripts = registryScripts.filter(i => !scripts.some(r => r.import.name === i.import.name))

      // augment types to support the integrations registry
      extendTypes(name!, async ({ typesPath }) => {
        return `
declare module '#app' {
  interface NuxtApp {
    ${nuxt.options.dev ? `_scripts: (import('#nuxt-scripts').NuxtAppScript)[]` : ''}
  }
}
declare module '#nuxt-scripts' {
    type NuxtUseScriptOptions = Omit<import('${typesPath}').NuxtUseScriptOptions, 'use' | 'beforeInit'>
    interface ScriptRegistry {
${newScripts.map((i) => {
  const key = i.import.name.replace('useScript', '')
          const keyLcFirst = key.substring(0, 1).toLowerCase() + key.substring(1)
          return `        ${keyLcFirst}?: import('${i.import.from}').${key}Input | [import('${i.import.from}').${key}Input, NuxtUseScriptOptions]`
        }).join('\n')}
    }
}
`
      })

      if (config.globals?.length || Object.keys(config.registry || {}).length) {
        // create a virtual plugin
        addPluginTemplate({
          filename: `modules/${name!.replace('/', '-')}.mjs`,
          getContents() {
            const imports = ['useScript', 'defineNuxtPlugin']
            const inits = []
            // for global scripts, we can initialise them script away
            for (const [k, c] of Object.entries(config.registry || {})) {
              const importDefinition = registryScripts.find(i => i.import.name === `useScript${k.substring(0, 1).toUpperCase() + k.substring(1)}`)
              if (importDefinition) {
                // title case
                imports.unshift(importDefinition.import.name)
                inits.push(`${importDefinition.import.name}(${JSON.stringify(c === true ? {} : c)});`)
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
      }
      const scriptMap = new Map<string, string>()
      const { normalizeScriptData } = setupPublicAssetStrategy(config.assets)

      const moduleInstallPromises: Map<string, () => Promise<boolean> | undefined> = new Map()
      addBuildPlugin(NuxtScriptAssetBundlerTransformer({
        scripts,
        defaultBundle: config.defaultScriptOptions?.bundle,
        moduleDetected(module) {
          if (nuxt.options.dev && module !== '@nuxt/scripts' && !moduleInstallPromises.has(module) && !hasNuxtModule(module))
            moduleInstallPromises.set(module, () => installNuxtModule(module))
        },
        resolveScript(src) {
          if (scriptMap.has(src))
            return scriptMap.get(src) as string
          const url = normalizeScriptData(src)
          scriptMap.set(src, url)
          return url
        },
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
