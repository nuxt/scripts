import type { Nuxt } from '@nuxt/schema'
import { addTypeTemplate, getNuxtVersion } from '@nuxt/kit'

type NitroRuntimeCompatibility
  = | { _tag: 'nitro-v2' }
    | { _tag: 'nitro-v3' }

interface NitroCompatibilityOptions {
  alias?: Record<string, string>
  virtual?: Record<string, string>
}

interface NitroCompatibilityDependencies {
  addTypeTemplate: typeof addTypeTemplate
  getNuxtVersion: typeof getNuxtVersion
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

// Nuxt resolves bare `nitro/*` specifiers for module code through `@nuxt/nitro-server`
const nitroV3Runtime = `export { useNitroApp } from 'nitro/app'
export { defineCachedFunction } from 'nitro/cache'
import { useRuntimeConfig as _useRuntimeConfig } from 'nitro/runtime-config'
export function useRuntimeConfig(_event) { return _useRuntimeConfig() }
`

function applyNitroRuntimeCompatibility(nuxt: Nuxt, compatibility: NitroRuntimeCompatibility): void {
  const nuxtOptions = nuxt.options as Nuxt['options'] & { nitro?: NitroCompatibilityOptions }
  const nitroOptions = nuxtOptions.nitro ||= {}
  const h3Runtime = compatibility._tag === 'nitro-v3' ? 'nitro/h3' : 'h3'
  nitroOptions.alias ||= {}
  nitroOptions.virtual ||= {}
  const nuxtAliases = nuxtOptions.alias ||= {}
  delete nuxtAliases[H3_RUNTIME_MODULE]
  nuxtOptions.alias = { [H3_RUNTIME_MODULE]: h3Runtime, ...nuxtAliases }
  nitroOptions.alias[H3_RUNTIME_MODULE] = h3Runtime
  nitroOptions.virtual[NITRO_RUNTIME_MODULE] = compatibility._tag === 'nitro-v3'
    ? nitroV3Runtime
    : nitroV2Runtime
}

export function setupNitroRuntimeCompatibility(
  nuxt: Nuxt,
  dependencies: NitroCompatibilityDependencies = defaultDependencies,
): void {
  const compatibility: NitroRuntimeCompatibility = Number.parseInt(dependencies.getNuxtVersion(nuxt), 10) >= 5
    ? { _tag: 'nitro-v3' }
    : { _tag: 'nitro-v2' }

  applyNitroRuntimeCompatibility(nuxt, compatibility)
  nuxt.hooks.hookOnce('modules:done', () => applyNitroRuntimeCompatibility(nuxt, compatibility))
  dependencies.addTypeTemplate({
    filename: TYPE_TEMPLATE_FILENAME,
    getContents: async () => renderRuntimeDeclarations(compatibility),
  }, { nitro: true, node: true, nuxt: true })
}
