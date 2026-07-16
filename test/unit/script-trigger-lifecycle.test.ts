/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
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
    const scope = effectScope()
    let trigger!: Promise<boolean>
    scope.run(() => {
      trigger = useScriptTriggerIdleTimeout({ timeout: 1000 })
    })

    scope.stop()
    await expect(trigger).resolves.toBe(false)
    readyCallbacks[0]!()
    await vi.advanceTimersByTimeAsync(1000)

    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not install interaction listeners after its scope was disposed', async () => {
    const target = new EventTarget()
    const addEventListener = vi.spyOn(target, 'addEventListener')
    const scope = effectScope()
    let trigger!: Promise<boolean>
    scope.run(() => {
      trigger = useScriptTriggerInteraction({ events: ['click', 'pointerdown'], target })
    })

    scope.stop()
    await expect(trigger).resolves.toBe(false)
    readyCallbacks[0]!()

    expect(addEventListener).not.toHaveBeenCalled()
  })

  it('removes every interaction listener when one event settles the trigger', async () => {
    const target = new EventTarget()
    const removeEventListener = vi.spyOn(target, 'removeEventListener')
    const scope = effectScope()
    let trigger!: Promise<boolean>
    scope.run(() => {
      trigger = useScriptTriggerInteraction({ events: ['click', 'pointerdown'], target })
    })

    readyCallbacks[0]!()
    target.dispatchEvent(new Event('click'))

    await expect(trigger).resolves.toBe(true)
    expect(removeEventListener.mock.calls.map(([event]) => event)).toEqual(
      expect.arrayContaining(['click', 'pointerdown']),
    )
    scope.stop()
  })

  it('clears the service-worker fallback timer once controllerchange fires', async () => {
    const serviceWorker = Object.assign(new EventTarget(), { controller: null })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorker,
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const scope = effectScope()
    let trigger!: Promise<boolean>
    scope.run(() => {
      trigger = useScriptTriggerServiceWorker({ timeout: 1000 })
    })

    serviceWorker.dispatchEvent(new Event('controllerchange'))
    await expect(trigger).resolves.toBe(true)
    await vi.advanceTimersByTimeAsync(1000)

    expect(warn).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    scope.stop()
  })
})
