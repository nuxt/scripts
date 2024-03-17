import fsp from 'node:fs/promises'
import { addDevServerHandler, useNuxt } from '@nuxt/kit'
import { createError, eventHandler, lazyEventHandler } from 'h3'
import { fetch } from 'ofetch'
import { colors } from 'consola/utils'
import { defu } from 'defu'
import type { NitroConfig } from 'nitropack'
import { hasProtocol, joinURL, parseURL } from 'ufo'
import { join } from 'pathe'
import { hash } from 'ohash'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs-lite'
import { logger } from './logger'

import type { ModuleOptions } from './types'

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

// TODO: replace this with nuxt/assets when it is released
export function setupPublicAssetStrategy(options: ModuleOptions['assets'] = {}) {
  const assetsBaseURL = options.prefix || '/_scripts'
  const nuxt = useNuxt()
  const renderedScriptSrc = new Map<string, string>()

  // TODO: refactor to use nitro storage when it can be cached between builds
  const storage = createStorage(fsDriver({
    base: 'node_modules/.cache/nuxt/scripts',
  }))

  function normalizeScriptData(src: string): string {
    if (hasProtocol(src, { acceptRelative: true })) {
      src = src.replace(/^\/\//, 'https://')
      const url = parseURL(src)
      const file = [
        `${hash(url)}.js`, // force an extension
      ].filter(Boolean).join('-')

      renderedScriptSrc.set(file, src)
      return joinURL(assetsBaseURL, file)
    }
    return src
  }

  // Register font proxy URL for development
  addDevServerHandler({
    route: assetsBaseURL,
    handler: lazyEventHandler(async () => {
      return eventHandler(async (event) => {
        const filename = event.path.slice(1)
        const url = renderedScriptSrc.get(event.path.slice(1))
        if (!url)
          throw createError({ statusCode: 404 })
        const key = `data:scripts:${filename}`
        // Use storage to cache the font data between requests
        let res = await storage.getItemRaw(key)
        if (!res) {
          res = await fetch(url).then(r => r.arrayBuffer()).then(r => Buffer.from(r))
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

  nuxt.hook('nitro:init', async (nitro) => {
    if (nuxt.options.dev)
      return
    nitro.hooks.hook('rollup:before', async () => {
      await fsp.rm(cacheDir, { recursive: true, force: true })
      await fsp.mkdir(cacheDir, { recursive: true })
      let banner = false
      for (const [filename, url] of renderedScriptSrc) {
        const key = `data:scripts:${filename}`
        // Use storage to cache the font data between builds
        let res = await storage.getItemRaw(key)
        if (!res) {
          if (!banner) {
            banner = true
            logger.info('Downloading scripts...')
          }
          let encoding
          let size = 0
          res = await fetch(url).then((r) => {
            encoding = r.headers.get('content-encoding')
            size = Number(r.headers.get('content-length') / 1024)
            return r.arrayBuffer()
          }).then(r => Buffer.from(r))
          logger.log(colors.gray(`  ├─ ${url} → ${joinURL(assetsBaseURL, filename)} (${size.toFixed(2)} kB ${encoding})`))
          await storage.setItemRaw(key, res)
        }
        await fsp.writeFile(join(cacheDir, filename), res)
      }
      if (banner)
        logger.success('Scripts downloaded and cached.')
    })
  })

  return { normalizeScriptData }
}
