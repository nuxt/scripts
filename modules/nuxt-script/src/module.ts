import { addImportsDir, createResolver, defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxt/scripts',
    configKey: 'scripts',
  },
  defaults: {},
  async setup() {
    const { resolve } = createResolver(import.meta.url)

    addImportsDir(resolve('./runtime/composables'))
  },
})
