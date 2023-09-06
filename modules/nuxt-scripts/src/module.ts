import { addImports, createResolver, defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-scripts',
    configKey: 'scripts',
  },
  defaults: {},
  async setup() {
    const { resolve } = createResolver(import.meta.url)

    // worker dependency
    // await installModule('@nuxtjs/partytown')
    // adds third party specific globals and composables

    // nuxt-scripts is just a useScript and a bunch of transformers
    addImports({
      name: 'useScript',
      from: resolve('./runtime/composables/useScript'),
    })
  },
})
