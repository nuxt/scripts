/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useScriptPulseAnalytics } from '../../packages/script/src/runtime/registry/pulse-analytics'
import { useScriptRybbitAnalytics } from '../../packages/script/src/runtime/registry/rybbit-analytics'

const mocks = vi.hoisted(() => ({
  definition: undefined as any,
  useRegistryScript: vi.fn(),
}))

vi.mock('@unhead/vue', () => ({ useHead: vi.fn() }))
vi.mock('../../packages/script/src/runtime/utils', () => ({
  useRegistryScript: mocks.useRegistryScript,
}))

function setup(options: Record<string, unknown>, composable: (o: any) => any) {
  mocks.useRegistryScript.mockImplementation((_key: string, factory: (o: any) => any) => {
    mocks.definition = factory(options)
    return { status: ref('awaitingLoad'), signal: new AbortController().signal, load: vi.fn(), proxy: {} }
  })
  composable(options)
  return mocks.definition.scriptOptions.use as () => any
}

// The script proxy already records calls made before load and replays them once
// the script resolves. A registry entry that also buffers them delivers the
// event twice, so a call made before the vendor API exists must be dropped here.
describe('pre-load calls are not replayed twice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete (window as any).pulse
    delete (window as any).rybbit
    delete (globalThis as any)[Symbol.for('nuxt-scripts.pulse-queue')]
    delete (globalThis as any)[Symbol.for('nuxt-scripts.rybbit-queue')]
  })

  it('pulse track() reaches the tracker exactly once', () => {
    const use = setup({ domain: 'example.com' }, useScriptPulseAnalytics as any)
    const api = use()

    api.track('signup', { plan: 'pro' })

    const track = vi.fn()
    ;(window as any).pulse = { track, cleanPath: () => '/' }
    use() // use() runs again once the script resolves

    expect(track, 'nothing may be flushed by the registry entry itself').not.toHaveBeenCalled()

    // the script proxy replays the buffered call against the resolved api
    api.track('signup', { plan: 'pro' })
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('signup', { plan: 'pro' }, undefined)
  })

  it('rybbit event() reaches the tracker exactly once', () => {
    const use = setup({ siteId: '874' }, useScriptRybbitAnalytics as any)
    const api = use()

    api.event('signup', { plan: 'pro' })

    const event = vi.fn()
    ;(window as any).rybbit = { event }
    use()

    expect(event, 'nothing may be flushed by the registry entry itself').not.toHaveBeenCalled()

    api.event('signup', { plan: 'pro' })
    expect(event).toHaveBeenCalledTimes(1)
  })

  it('pulse passes revenue through once the tracker is ready', () => {
    const use = setup({ domain: 'example.com' }, useScriptPulseAnalytics as any)
    const track = vi.fn()
    ;(window as any).pulse = { track, cleanPath: () => '/' }

    use().track('purchase', { product: 'annual_plan' }, 99)

    expect(track).toHaveBeenCalledExactlyOnceWith('purchase', { product: 'annual_plan' }, 99)
  })

  it('pulse writes a presence flag only for options set to false', () => {
    setup({ domain: 'example.com', trackScroll: false, trackOutbound: true }, useScriptPulseAnalytics as any)
    const input = mocks.definition.scriptInput as Record<string, unknown>

    expect(input['data-no-scroll']).toBe('')
    expect(input['data-no-outbound']).toBeUndefined()
    expect(input['data-no-downloads']).toBeUndefined()
  })
})
