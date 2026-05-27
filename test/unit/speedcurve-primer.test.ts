/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useHeadCalls: any[] = []

vi.mock('nuxt/app', () => ({
  useHead: (input: any) => useHeadCalls.push(input),
  useRouter: () => ({ beforeEach: vi.fn(), afterEach: vi.fn() }),
  useNuxtApp: () => ({ hook: vi.fn(), payload: { serverRendered: true } }),
  useRuntimeConfig: () => ({ public: { 'scripts': {}, 'nuxt-scripts': {} } }),
  createError: (e: any) => new Error(e.message),
  injectHead: vi.fn(),
  onNuxtReady: vi.fn(),
}))

vi.mock('../../packages/script/src/runtime/composables/useScript', () => ({
  useScript: vi.fn(() => ({ proxy: {}, status: 'awaitingLoad' })),
}))

describe('useScriptSpeedCurve primer injection', () => {
  beforeEach(() => {
    useHeadCalls.length = 0
    vi.clearAllMocks()
  })

  it('calls useHead with a critical inline head script', async () => {
    const { useScriptSpeedCurve } = await import('../../packages/script/src/runtime/registry/speedcurve')

    useScriptSpeedCurve({ id: 'TEST_ID_123' })

    // The wrapped beforeInit in useRegistryScript calls useHead during beforeInit
    const { useScript } = await import('../../packages/script/src/runtime/composables/useScript')
    const lastCall = vi.mocked(useScript).mock.calls.at(-1)
    const opts = lastCall?.[1] as any
    opts?.beforeInit?.()

    const headCall = useHeadCalls.find(c => c.script?.length > 0)
    expect(headCall).toBeDefined()
    const entry = headCall.script[0]
    expect(entry.key).toBe('speedcurve-lux-primer')
    expect(entry.tagPriority).toBe('critical')
    expect(entry.tagPosition).toBe('head')
    expect(entry.innerHTML).toContain('LUX')
  })

  it('includes customer id in lux.js src', async () => {
    const { useScriptSpeedCurve } = await import('../../packages/script/src/runtime/registry/speedcurve')
    const { useScript } = await import('../../packages/script/src/runtime/composables/useScript')

    useScriptSpeedCurve({ id: 'MY_CUSTOMER_ID' })

    const lastCall = vi.mocked(useScript).mock.calls.at(-1)
    expect(lastCall?.[0]).toMatchObject({ src: expect.stringContaining('id=MY_CUSTOMER_ID') })
  })

  it('sets crossorigin: anonymous on the script input', async () => {
    const { useScriptSpeedCurve } = await import('../../packages/script/src/runtime/registry/speedcurve')
    const { useScript } = await import('../../packages/script/src/runtime/composables/useScript')

    useScriptSpeedCurve({ id: 'SOME_ID' })

    const lastCall = vi.mocked(useScript).mock.calls.at(-1)
    expect(lastCall?.[0]).toMatchObject({ crossorigin: 'anonymous' })
  })
})
