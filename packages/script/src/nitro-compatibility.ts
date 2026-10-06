import type { Nuxt } from '@nuxt/schema'
import { addServerTemplate, addTypeTemplate, getNitroVersion } from '@nuxt/kit'

/** Caching and lifecycle hooks remain Nitro-specific on Nuxt 4 and Nuxt 5. */
export function setupNitroRuntimeCompatibility(nuxt: Nuxt): void {
  const nitroVersion = getNitroVersion(nuxt)
  if (nitroVersion !== 2 && nitroVersion !== 3)
    throw new Error('[nuxt-scripts] Server features require Nitro 2 or Nitro 3.')

  const runtime = nitroVersion === 3
    ? `export { useNitroApp } from 'nitro/app'\nexport { defineCachedFunction } from 'nitro/cache'\n`
    : `export { useNitroApp, defineCachedFunction } from 'nitropack/runtime'\n`
  addServerTemplate({
    filename: '#nuxt-scripts/nitro',
    getContents: () => runtime,
  })

  const declaration = addTypeTemplate({
    filename: 'types/nuxt-scripts-nitro.d.ts',
    getContents: () => `declare module '#nuxt-scripts/nitro' {\n${runtime}\n}\n`,
  }, { nitro: true, node: true, nuxt: true })
  nuxt.hook('prepare:types', ({ serverReferences, serverTsConfig }) => {
    serverReferences.push({ path: declaration.dst })
    serverTsConfig.files ||= []
    serverTsConfig.files.push(declaration.dst)
  })
}
