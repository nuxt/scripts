import { addImportsDir, createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'
import { readPackageJSON } from 'pkg-types'
import type { ScriptBase } from '@unhead/schema'
import type { NuxtUseScriptOptions } from './runtime/types'
import { setupDevToolsUI } from './devtools'

export interface ModuleOptions {
  /**
   * Set default script tag attributes and script options.
   */
  defaults?: {
    /**
     * Default script tag attributes.
     */
    script?: ScriptBase
    /**
     * Default script options.
     */
    options?: NuxtUseScriptOptions
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
      nuxt: '^3.9.0',
      bridge: false,
    },
  },
  defaults: {
    enabled: true,
    debug: false,
  },
  async setup(config, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const { name, version } = await readPackageJSON(resolve('../package.json'))
    const logger = useLogger(name)
    if (config.enabled === false) {
      // TODO fallback to useHead
      logger.debug('The module is disabled, skipping setup.')
      return
    }
    // allow augmenting the options
    nuxt.options.alias['#nuxt-scripts'] = resolve('./runtime/types')
    // @ts-expect-error runtime
    nuxt.options.runtimeConfig['nuxt-scripts'] = { version }
    nuxt.options.runtimeConfig.public['nuxt-scripts'] = { defaults: config.defaults }
    addImportsDir(resolve('./runtime/composables'))

    if (nuxt.options.dev)
      setupDevToolsUI(config, resolve)
  },
})
