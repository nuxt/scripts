import {
  addComponentsDir,
  addImportsDir,
  createResolver,
  defineNuxtModule,
  installModule,
} from '@nuxt/kit'

export interface ModuleOptions {
  worker?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-third-party-capital',
    configKey: 'thirdPartyCapital',
  },
  defaults: {},
  async setup(options) {
    const { resolve } = createResolver(import.meta.url)

    if (options.worker)
      await installModule('@nuxtjs/partytown')
    await addComponentsDir({ path: resolve('./runtime/components') })
    addImportsDir(resolve('./runtime/composables'))
  },
})
