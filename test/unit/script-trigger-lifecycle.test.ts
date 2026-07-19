/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScriptTriggerIdleTimeout } from '../../packages/script/src/runtime/composables/useScriptTriggerIdleTimeout'
import { useScriptTriggerInteraction } from '../../packages/script/src/runtime/composables/useScriptTriggerInteraction'
import { useScriptTriggerServiceWorker } from '../../packages/script/src/runtime/composables/useScriptTriggerServiceWorker'

const readyCallbacks: Array<() => void> = []

vi.mock('nuxt/app', () => ({
  onNuxtReady: (callback: () => void) => readyCallbacks.push(callback),
}))

describe('script trigger lifecycle cleanup', () => {
  beforeEach(() => {
    readyCallbacks.length = 0
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does not start an idle timer after its scope is disposed before Nuxt is ready', async () => {
    const load = vi.fn()
    const trigger = useScriptTriggerIdleTimeout({ timeout: 1000 })
    const dispose = trigger(load)

    dispose()
    readyCallbacks[0]!()
    await vi.advanceTimersByTimeAsync(1000)

    expect(vi.getTimerCount()).toBe(0)
    expect(load).not.toHaveBeenCalled()
  })

  it('does not install interaction listeners after its scope was disposed', async () => {
    const target = new EventTarget()
    const addEventListener = vi.spyOn(target, 'addEventListener')
    const load = vi.fn()
    const trigger = useScriptTriggerInteraction({ events: ['click', 'pointerdown'], target })
    const dispose = trigger(load)

    dispose()
    readyCallbacks[0]!()

    expect(addEventListener).not.toHaveBeenCalled()
    expect(load).not.toHaveBeenCalled()
  })

  it('removes every interaction listener when one event settles the trigger', async () => {
    const target = new EventTarget()
    const removeEventListener = vi.spyOn(target, 'removeEventListener')
    const load = vi.fn()
    const trigger = useScriptTriggerInteraction({ events: ['click', 'pointerdown'], target })
    const dispose = trigger(load)

    readyCallbacks[0]!()
    target.dispatchEvent(new Event('click'))

    expect(load).toHaveBeenCalledOnce()
    expect(removeEventListener.mock.calls.map(([event]) => event)).toEqual(
      expect.arrayContaining(['click', 'pointerdown']),
    )
    dispose()
  })

  it('clears the service-worker fallback timer once controllerchange fires', async () => {
    const serviceWorker = Object.assign(new EventTarget(), { controller: null })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const load = vi.fn()
    const trigger = useScriptTriggerServiceWorker({ timeout: 1000 })
    const dispose = trigger(load)

    serviceWorker.dispatchEvent(new Event('controllerchange'))
    await vi.advanceTimersByTimeAsync(1000)

    expect(load).toHaveBeenCalledOnce()
    expect(warn).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    dispose()
  })
})
