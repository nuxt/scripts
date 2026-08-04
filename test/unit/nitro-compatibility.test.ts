import type { Nuxt } from '@nuxt/schema'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupNitroRuntimeCompatibility } from '../../packages/script/src/nitro-compatibility'

const { addTypeTemplateMock, hookOnceMock } = vi.hoisted(() => ({
  addTypeTemplateMock: vi.fn(),
  hookOnceMock: vi.fn(),
}))

function createNuxt(): Nuxt {
  return {
    hooks: {
      hookOnce: hookOnceMock,
    },
    options: {
      alias: {
        '#nuxt-scripts': '/runtime',
      },
      nitro: {},
    },
  } as Nuxt
}

function createDependencies(version: string, resolveNitroImport?: (id: string) => Promise<string>) {
  return {
    addTypeTemplate: addTypeTemplateMock,
    getNuxtVersion: () => version,
    resolveNitroImport,
  }
}

describe('setupNitroRuntimeCompatibility', () => {
  beforeEach(() => {
    addTypeTemplateMock.mockReset()
    hookOnceMock.mockReset()
  })

  it('registers explicit Nitro 2 runtime modules', async () => {
    const nuxt = createNuxt()

    await setupNitroRuntimeCompatibility(nuxt, createDependencies('4.5.0'))

    expect(nuxt.options.alias['#nuxt-scripts/h3']).toBe('h3')
    expect(Object.keys(nuxt.options.alias)[0]).toBe('#nuxt-scripts/h3')
    expect(nuxt.options.nitro.alias?.['#nuxt-scripts/h3']).toBe('h3')
    expect(nuxt.options.nitro.virtual?.['#nuxt-scripts/nitro']).toContain('from \'nitropack/runtime\'')
    expect(addTypeTemplateMock).toHaveBeenCalledWith(expect.any(Object), { nitro: true, node: true, nuxt: true })

    const template = addTypeTemplateMock.mock.calls[0]![0]
    await expect(template.getContents()).resolves.toContain('declare module \'#nuxt-scripts/nitro\'')
    await expect(template.getContents()).resolves.toContain('export * from \'h3\'')
  })

  it('normalizes resolved Nitro 3 runtime modules without package dependencies', async () => {
    const nuxt = createNuxt()
    const resolveNitroImport = vi.fn(async (id: string) => `file:///nuxt-nitro/${id.replace('/', '-')}.mjs`)

    await setupNitroRuntimeCompatibility(nuxt, createDependencies('5.0.0', resolveNitroImport))

    expect(resolveNitroImport).toHaveBeenCalledTimes(4)
    expect(nuxt.options.alias['#nuxt-scripts/h3']).toBe('file:///nuxt-nitro/nitro-h3.mjs')
    expect(nuxt.options.nitro.alias?.['#nuxt-scripts/h3']).toBe('file:///nuxt-nitro/nitro-h3.mjs')
    expect(nuxt.options.nitro.virtual?.['#nuxt-scripts/nitro']).toContain('file:///nuxt-nitro/nitro-app.mjs')
    expect(nuxt.options.nitro.virtual?.['#nuxt-scripts/nitro']).toContain('file:///nuxt-nitro/nitro-cache.mjs')
    expect(nuxt.options.nitro.virtual?.['#nuxt-scripts/nitro']).not.toContain('from \'nitro/')
    expect(nuxt.options.nitro.virtual?.['#nuxt-scripts/nitro']).toContain('useRuntimeConfig(_event)')

    const template = addTypeTemplateMock.mock.calls[0]![0]
    await expect(template.getContents()).resolves.toContain('export * from \'nitro/h3\'')
    await expect(template.getContents()).resolves.toContain('useRuntimeConfig(event?:')
  })

  it('reasserts compatibility after other modules finish setup', async () => {
    const nuxt = createNuxt()
    const resolveNitroImport = async (id: string) => `file:///nuxt-nitro/${id.replace('/', '-')}.mjs`

    await setupNitroRuntimeCompatibility(nuxt, createDependencies('5.0.0', resolveNitroImport))
    nuxt.options.nitro.virtual!['#nuxt-scripts/nitro'] = 'stale'
    hookOnceMock.mock.calls[0]![1]()

    expect(nuxt.options.nitro.virtual?.['#nuxt-scripts/nitro']).toContain('file:///nuxt-nitro/nitro-app.mjs')
  })
})
