import { defineNuxtModule, addPlugin, createResolver, addTemplate, addAutoImport, addAutoImportDir } from '@nuxt/kit'
import { genArrayFromRaw, genImport, genString } from 'knitwork'

const builtInProviders = ['debug']
type BuiltInProvider = 'debug' | 'gtm'
type ProviderOptions = Record<string, any>

export interface ProviderConfig {
  disabled?: boolean
  provider: string
  options?: ProviderOptions
}

export interface ModuleOptions extends Partial<Record<BuiltInProvider, ProviderOptions>> {
  providers?: {
    [name: string]: ProviderOptions
  } & Record<BuiltInProvider, never>
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxt/scripts',
    configKey: 'scripts'
  },
  defaults: {
    // debug: nuxt.options.dev
  },
  setup (options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // Resolve providers
    const providers = []
    for (const name of builtInProviders) {
      if (options[name]) {
        providers.push({
          name,
          src: resolver.resolve('runtime/providers/' + name),
          options: options[name]
        })
      }
    }
    for (const name in options.providers) {
      const providerOpts = options.providers[name]
      if (providerOpts.disabled) {
        continue
      }
      if (builtInProviders.includes(name)) {
        throw new Error(`[nuxt scripts] Built-in provider \`${name}\` should be configured at the top level via scripts.${name}`)
      }
      if (!providerOpts.provider) {
        throw new Error(`[nuxt scripts] Configured provider ${name} is missing \`provider\` key.`)
      }
      providers.push({
        name,
        src: resolver.resolve(providerOpts.provider),
        options: providerOpts.provider
      })
    }

    // Generate code for configured providers
    addTemplate({
      filename: 'script-providers.mjs',
      getContents () {
        return [
          `${providers.map(p => genImport(p.src, '_' + p.name)).join('\n')}`,
          `export default ${genArrayFromRaw(
            providers.map(p => ({ name: genString(p.name), provider: '_' + p.name, options: p.options }))
          )}`
        ].join('\n')
      }
    })

    // Add plugin
    nuxt.options.build.transpile.push(resolver.resolve('runtime'))
    addPlugin(resolver.resolve('runtime/plugin'))

    // Add composables
    addAutoImport({ name: 'addScriptsProvider', as: 'addScriptsProvider', from: resolver.resolve('runtime/composables') })
  }
})
