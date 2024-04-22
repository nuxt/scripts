import {
  addBuildPlugin,
  addComponentsDir,
  addImports,
  addImportsDir,
  addPlugin,
  addTemplate,
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
      assetStrategy: 'bundle', // Not supported on all scripts, only if the src is static, runtime fallback?
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

    nuxt.hooks.hook('modules:done', async () => {
      addImports(registry.map((i) => {
        i.priority = -1
        i.module = i.module || '@nuxt/scripts'
        return i
      }))

      // @ts-expect-error runtime
      await nuxt.hooks.callHook('scripts:registry', registry)

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
${registry.filter(i => i.key && i.module !== '@nuxt/scripts').map((i) => {
          const ucFirstKey = i.key!.substring(0, 1).toUpperCase() + i.key!.substring(1)
          return `        ${i.key}?: import('${i.from}').${ucFirstKey}Input | [import('${i.from}').${ucFirstKey}Input, NuxtUseScriptOptions]`
        }).join('\n')}
    }
}
`
      })

      if (config.globals?.length || Object.keys(config.register || {}).length) {
        // create a virtual plugin
        const template = addTemplate({
          filename: `modules/${name!.replace('/', '-')}.mjs`,
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
                inits.push(`${importDefinition.name}(${JSON.stringify(c === true ? {} : c)});`)
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

      const moduleInstallPromises: Map<string, () => Promise<boolean> | undefined> = new Map()
      addBuildPlugin(NuxtScriptAssetBundlerTransformer({
        registry,
        defaultBundle: config.defaultScriptOptions?.assetStrategy === 'bundle',
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
