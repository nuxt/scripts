import { addDevServerHandler, useNuxt } from '@nuxt/kit'
import { createError, eventHandler, lazyEventHandler } from 'h3'
import { fetch } from 'ofetch'
import { defu } from 'defu'
import type { NitroConfig } from 'nitropack'
import { joinURL } from 'ufo'
import { join } from 'pathe'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs-lite'

import type { ModuleOptions } from './module'

const renderedScript = new Map<string, {
  content: Buffer
  /**
   * in kb
   */
  size: number
  encoding?: string
  src: string
  filename?: string
} | Error>()

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

// TODO: refactor to use nitro storage when it can be cached between builds
export const bundleStorage = () => {
  const nuxt = useNuxt()
  return createStorage({
    driver: fsDriver({
      base: resolve(nuxt.options.rootDir, 'node_modules/.cache/nuxt/scripts'),
    }),
  })
}

// TODO: replace this with nuxt/assets when it is released
export function setupPublicAssetStrategy(options: ModuleOptions['assets'] = {}) {
  const assetsBaseURL = options.prefix || '/_scripts'
  const nuxt = useNuxt()
  const storage = bundleStorage()

  // Register font proxy URL for development
  addDevServerHandler({
    route: assetsBaseURL,
    handler: lazyEventHandler(async () => {
      return eventHandler(async (event) => {
        const filename = event.path.slice(1)
        const scriptDescriptor = renderedScript.get(join(assetsBaseURL, event.path.slice(1)))

        if (!scriptDescriptor || scriptDescriptor instanceof Error)
          throw createError({ statusCode: 404 })

        const key = `bundle:${filename}`
        // Use storage to cache the font data between requests
        let res = await storage.getItemRaw(key)
        if (!res) {
          res = await fetch(scriptDescriptor.src).then(r => r.arrayBuffer()).then(r => Buffer.from(r))
          await storage.setItemRaw(key, res)
        }
        return res
      })
    }),
  })

  if (nuxt.options.dev) {
    nuxt.options.routeRules ||= {}
    nuxt.options.routeRules[joinURL(assetsBaseURL, '**')] = {
      cache: {
        maxAge: ONE_YEAR_IN_SECONDS,
      },
    }
  }

  nuxt.options.nitro.publicAssets ||= []
  const cacheDir = join(nuxt.options.buildDir, 'cache', 'scripts')
  nuxt.options.nitro.publicAssets.push()
  nuxt.options.nitro = defu(nuxt.options.nitro, {
    publicAssets: [{
      dir: cacheDir,
      maxAge: ONE_YEAR_IN_SECONDS,
      baseURL: assetsBaseURL,
    }],
    prerender: {
      ignore: [assetsBaseURL],
    },
  } satisfies NitroConfig)

  return {
    renderedScript,
  }
}
