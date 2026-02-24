import { addDevServerHandler, extendRouteRules, useNuxt, tryUseNuxt } from '@nuxt/kit'
import { createError, eventHandler, lazyEventHandler } from 'h3'
import { fetch } from 'ofetch'
import type { NitroConfig } from 'nitropack'
import { joinURL } from 'ufo'
import { join, resolve } from 'pathe'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs-lite'

import type { ModuleOptions } from './module'

declare module '@nuxt/schema' {
  interface NuxtHooks {
    'nitro:config': (config: NitroConfig) => void | Promise<void>
  }
}

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

/**
 * Cache duration for bundled scripts in production (1 year).
 * Scripts are cached with long expiration since they are content-addressed by hash.
 */
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

// TODO: refactor to use nitro storage when it can be cached between builds
export const bundleStorage = () => {
  const nuxt = tryUseNuxt()
  return createStorage({
    driver: fsDriver({
      base: resolve(nuxt?.options.rootDir || '', 'node_modules/.cache/nuxt/scripts'),
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

        // Use pre-rendered content which includes proxy rewrites for first-party mode
        if (scriptDescriptor.content) {
          return scriptDescriptor.content
        }

        // Fallback to storage cache
        const key = `bundle:${filename}`
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
    extendRouteRules(joinURL(assetsBaseURL, '**'), {
      cache: {
        maxAge: ONE_YEAR_IN_SECONDS,
      },
    })
  }

  const cacheDir = join(nuxt.options.buildDir, 'cache', 'scripts')
  nuxt.hook('nitro:config', (nitroConfig) => {
    nitroConfig.publicAssets ||= []
    nitroConfig.publicAssets.push({
      dir: cacheDir,
      maxAge: ONE_YEAR_IN_SECONDS,
      baseURL: assetsBaseURL,
    })
    nitroConfig.prerender ||= {}
    nitroConfig.prerender.ignore ||= []
    nitroConfig.prerender.ignore.push(assetsBaseURL)
  })

  return {
    renderedScript,
  }
}
