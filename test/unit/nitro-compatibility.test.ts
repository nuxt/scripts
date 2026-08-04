import type { Nuxt } from '@nuxt/schema'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupNitroRuntimeCompatibility } from '../../packages/script/src/nitro-compatibility'

const { addTypeTemplateMock, getNuxtVersionMock, hookOnceMock } = vi.hoisted(() => ({
  addTypeTemplateMock: vi.fn(),
  getNuxtVersionMock: vi.fn(),
  hookOnceMock: vi.fn(),
}))

vi.mock('@nuxt/kit', async importOriginal => ({
  ...await importOriginal<typeof import('@nuxt/kit')>(),
  addTypeTemplate: addTypeTemplateMock,
  getNuxtVersion: getNuxtVersionMock,
}))

function createNuxt(): Nuxt {
  return {
    hooks: {
      hookOnce: hookOnceMock,
    },
    options: {
      nitro: {},
    },
  } as Nuxt
}

describe('setupNitroRuntimeCompatibility', () => {
  beforeEach(() => {
    addTypeTemplateMock.mockReset()
    getNuxtVersionMock.mockReset()
    hookOnceMock.mockReset()
  })

  it('registers explicit Nitro 2 runtime modules', async () => {
    getNuxtVersionMock.mockReturnValue('4.5.0')
    const nuxt = createNuxt()

    await setupNitroRuntimeCompatibility(nuxt)

    expect(nuxt.options.nitro.alias?.['#nuxt-scripts/h3']).toBe('h3')
    expect(nuxt.options.nitro.virtual?.['#nuxt-scripts/nitro']).toContain('from \'nitropack/runtime\'')
    expect(addTypeTemplateMock).toHaveBeenCalledWith(expect.any(Object), { nitro: true, node: true, nuxt: true })

    const template = addTypeTemplateMock.mock.calls[0]![0]
    await expect(template.getContents()).resolves.toContain('declare module \'#nuxt-scripts/nitro\'')
    await expect(template.getContents()).resolves.toContain('export * from \'h3\'')
  })

  it('normalizes resolved Nitro 3 runtime modules without package dependencies', async () => {
    getNuxtVersionMock.mockReturnValue('5.0.0')
    const nuxt = createNuxt()
    const resolveNitroImport = vi.fn(async (id: string) => `file:///nuxt-nitro/${id.replace('/', '-')}.mjs`)

    await setupNitroRuntimeCompatibility(nuxt, resolveNitroImport)

    expect(resolveNitroImport).toHaveBeenCalledTimes(4)
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
    getNuxtVersionMock.mockReturnValue('5.0.0')
    const nuxt = createNuxt()
    const resolveNitroImport = async (id: string) => `file:///nuxt-nitro/${id.replace('/', '-')}.mjs`

    await setupNitroRuntimeCompatibility(nuxt, resolveNitroImport)
    nuxt.options.nitro.virtual!['#nuxt-scripts/nitro'] = 'stale'
    hookOnceMock.mock.calls[0]![1]()

    expect(nuxt.options.nitro.virtual?.['#nuxt-scripts/nitro']).toContain('file:///nuxt-nitro/nitro-app.mjs')
  })
})
