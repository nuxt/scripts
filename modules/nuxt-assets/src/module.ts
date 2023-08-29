import { addImports, addServerHandler, createResolver, defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {
  routePrefix: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-assets',
    configKey: 'assets',
  },
  defaults: {
    routePrefix: '/__nuxt_assets__',
  },
  async setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    addServerHandler({
      route: `${options.routePrefix}/proxy`,
      handler: resolve('./runtime/server/proxy'),
    })
    addServerHandler({
      route: `${options.routePrefix}/inline`,
      handler: resolve('./runtime/server/inline'),
    })

    // nuxt-scripts is just a useScript and a bunch of transformers
    addImports({
      name: 'useInlineAsset',
      from: resolve('./runtime/composables/useInlineAsset'),
    })

    addImports({
      name: 'useProxyAsset',
      from: resolve('./runtime/composables/useProxyAsset'),
    })
  },
})
