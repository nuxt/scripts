import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('nuxt/app', () => ({
  createError: (input: { message: string }) => new Error(input.message),
  useRuntimeConfig: () => ({ public: { scripts: {} } }),
}))

vi.mock('../../packages/script/src/runtime/composables/useScript', () => ({
  useScript: vi.fn((input, options) => ({ input, options })),
}))

describe('useScriptLeaflet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the pinned stable build with official integrity metadata', async () => {
    const { useScriptLeaflet } = await import('../../packages/script/src/runtime/registry/leaflet')
    const { useScript } = await import('../../packages/script/src/runtime/composables/useScript')

    useScriptLeaflet()

    expect(vi.mocked(useScript).mock.calls.at(-1)?.[0]).toMatchObject({
      src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
      integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
      crossorigin: 'anonymous',
    })
  })

  it('does not apply the pinned integrity hash to a custom source', async () => {
    const { useScriptLeaflet } = await import('../../packages/script/src/runtime/registry/leaflet')
    const { useScript } = await import('../../packages/script/src/runtime/composables/useScript')

    useScriptLeaflet({
      scriptInput: { src: 'https://cdn.example.com/leaflet.js' },
    })

    const input = vi.mocked(useScript).mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(input.src).toBe('https://cdn.example.com/leaflet.js')
    expect(input).not.toHaveProperty('integrity')
  })
})
