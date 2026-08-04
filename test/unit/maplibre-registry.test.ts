import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('nuxt/app', () => ({
  createError: (input: { message: string }) => new Error(input.message),
  useRuntimeConfig: () => ({ public: { scripts: {} } }),
}))

vi.mock('../../packages/script/src/runtime/composables/useScript', () => ({
  useScript: vi.fn((input, options) => ({ input, options })),
}))

describe('useScriptMapLibre', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the pinned stable build with integrity metadata', async () => {
    const { useScriptMapLibre } = await import('../../packages/script/src/runtime/registry/maplibre')
    const { useScript } = await import('../../packages/script/src/runtime/composables/useScript')

    useScriptMapLibre()

    expect(vi.mocked(useScript).mock.calls.at(-1)?.[0]).toMatchObject({
      src: 'https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js',
      integrity: 'sha384-5+cfbwT0iiub6VsQAdn6yz16nr6sDiQoHx6tm4O8OVYXHYOxcffFmCJBL0dgdvGp',
      crossorigin: 'anonymous',
    })
  })

  it('does not apply the pinned integrity hash to a custom source', async () => {
    const { useScriptMapLibre } = await import('../../packages/script/src/runtime/registry/maplibre')
    const { useScript } = await import('../../packages/script/src/runtime/composables/useScript')

    useScriptMapLibre({
      scriptInput: { src: 'https://cdn.example.com/maplibre.js' },
    })

    const input = vi.mocked(useScript).mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(input.src).toBe('https://cdn.example.com/maplibre.js')
    expect(input).not.toHaveProperty('integrity')
  })
})
