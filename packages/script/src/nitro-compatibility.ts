import type { Nuxt } from '@nuxt/schema'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { addTypeTemplate, getNuxtVersion, resolvePath as resolveNuxtPath } from '@nuxt/kit'
import { dirname } from 'pathe'

type NitroRuntimeCompatibility
  = | { _tag: 'nitro-v2' }
    | {
      _tag: 'nitro-v3'
      app: string
      cache: string
      h3: string
      runtimeConfig: string
    }

type ResolveNitroImport = (id: string) => Promise<string>

interface NitroCompatibilityOptions {
  alias?: Record<string, string>
  virtual?: Record<string, string>
}

interface NitroCompatibilityDependencies {
  addTypeTemplate: typeof addTypeTemplate
  getNuxtVersion: typeof getNuxtVersion
  resolveNitroImport?: ResolveNitroImport
}

const NITRO_RUNTIME_MODULE = '#nuxt-scripts/nitro'
const H3_RUNTIME_MODULE = '#nuxt-scripts/h3'
const TYPE_TEMPLATE_FILENAME = 'types/nuxt-scripts-nitro.d.ts'
const defaultDependencies: NitroCompatibilityDependencies = {
  addTypeTemplate,
  getNuxtVersion,
}

const nitroV2Runtime = `export {
  defineCachedFunction,
  useNitroApp,
  useRuntimeConfig,
} from 'nitropack/runtime'
`

const nitroV3RuntimeTypes = `export { useNitroApp } from 'nitro/app'
export { defineCachedFunction } from 'nitro/cache'
export function useRuntimeConfig(event?: import('nitro/h3').H3Event): ReturnType<typeof import('nitro/runtime-config').useRuntimeConfig>
`

function indent(value: string, spaces: number): string {
  const padding = ' '.repeat(spaces)
  return value.split('\n').map(line => `${padding}${line}`).join('\n')
}

function renderRuntimeDeclarations(compatibility: NitroRuntimeCompatibility): string {
  const nitroRuntime = compatibility._tag === 'nitro-v3' ? nitroV3RuntimeTypes : nitroV2Runtime
  const h3Runtime = compatibility._tag === 'nitro-v3'
    ? `export * from 'nitro/h3'\n`
    : `export * from 'h3'\n`

  return `declare module '${NITRO_RUNTIME_MODULE}' {
${indent(nitroRuntime.trim(), 2)}
}

declare module '${H3_RUNTIME_MODULE}' {
${indent(h3Runtime.trim(), 2)}
}
`
}

function renderNitroV3Runtime(compatibility: Extract<NitroRuntimeCompatibility, { _tag: 'nitro-v3' }>): string {
  return `export { useNitroApp } from ${JSON.stringify(compatibility.app)}
export { defineCachedFunction } from ${JSON.stringify(compatibility.cache)}
import { useRuntimeConfig as _useRuntimeConfig } from ${JSON.stringify(compatibility.runtimeConfig)}
export function useRuntimeConfig(_event) { return _useRuntimeConfig() }
`
}

function applyNitroRuntimeCompatibility(nuxt: Nuxt, compatibility: NitroRuntimeCompatibility): void {
  const nuxtOptions = nuxt.options as Nuxt['options'] & { nitro?: NitroCompatibilityOptions }
  const nitroOptions = nuxtOptions.nitro ||= {}
  nitroOptions.alias ||= {}
  nitroOptions.virtual ||= {}
  nitroOptions.alias[H3_RUNTIME_MODULE] = compatibility._tag === 'nitro-v3' ? compatibility.h3 : 'h3'
  nitroOptions.virtual[NITRO_RUNTIME_MODULE] = compatibility._tag === 'nitro-v3'
    ? renderNitroV3Runtime(compatibility)
    : nitroV2Runtime
}

async function createNuxtNitroImportResolver(): Promise<ResolveNitroImport> {
  const nuxtDir = dirname(await resolveNuxtPath('nuxt/package.json'))
  const nitroDir = dirname(await resolveNuxtPath('@nuxt/nitro-server/package.json', { cwd: nuxtDir }))

  return async (id: string) => {
    const resolved = await resolveNuxtPath(id, { cwd: nitroDir })
    if (!existsSync(resolved))
      throw new Error(`[nuxt-scripts] Could not resolve Nitro runtime helper "${id}" from "${nitroDir}".`)
    return pathToFileURL(resolved).href
  }
}

async function resolveNitroV3Compatibility(resolveNitroImport: ResolveNitroImport): Promise<NitroRuntimeCompatibility> {
  const [app, cache, h3, runtimeConfig] = await Promise.all([
    resolveNitroImport('nitro/app'),
    resolveNitroImport('nitro/cache'),
    resolveNitroImport('nitro/h3'),
    resolveNitroImport('nitro/runtime-config'),
  ])

  return { _tag: 'nitro-v3', app, cache, h3, runtimeConfig }
}

export async function setupNitroRuntimeCompatibility(
  nuxt: Nuxt,
  dependencies: NitroCompatibilityDependencies = defaultDependencies,
): Promise<void> {
  const compatibility: NitroRuntimeCompatibility = Number.parseInt(dependencies.getNuxtVersion(nuxt), 10) >= 5
    ? await resolveNitroV3Compatibility(dependencies.resolveNitroImport || await createNuxtNitroImportResolver())
    : { _tag: 'nitro-v2' }

  applyNitroRuntimeCompatibility(nuxt, compatibility)
  nuxt.hooks.hookOnce('modules:done', () => applyNitroRuntimeCompatibility(nuxt, compatibility))
  dependencies.addTypeTemplate({
    filename: TYPE_TEMPLATE_FILENAME,
    getContents: async () => renderRuntimeDeclarations(compatibility),
  }, { nitro: true, node: true, nuxt: true })
}
