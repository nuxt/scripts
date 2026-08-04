import type { VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ScriptCarbonAds from '../../packages/script/src/runtime/components/ScriptCarbonAds.vue'
import ScriptLemonSqueezy from '../../packages/script/src/runtime/components/ScriptLemonSqueezy.vue'

const mocks = vi.hoisted(() => ({
  loadedCallbacks: [] as Array<(api: any) => void>,
  useScriptLemonSqueezy: vi.fn(() => ({
    onLoaded: (callback: (api: any) => void) => mocks.loadedCallbacks.push(callback),
  })),
  useScriptTriggerElement: vi.fn(() => 'onNuxtReady'),
}))

vi.mock('../../packages/script/src/runtime/composables/useScriptTriggerElement', () => ({
  useScriptTriggerElement: mocks.useScriptTriggerElement,
}))

vi.mock('../../packages/script/src/runtime/registry/lemon-squeezy', () => ({
  useScriptLemonSqueezy: mocks.useScriptLemonSqueezy,
}))

const wrappers: VueWrapper[] = []
let lemonSqueezyDescriptor: PropertyDescriptor | undefined

describe('script component lifecycle', () => {
  beforeEach(() => {
    mocks.loadedCallbacks.length = 0
    vi.clearAllMocks()
    lemonSqueezyDescriptor = Object.getOwnPropertyDescriptor(window, 'LemonSqueezy')
  })

  afterEach(() => {
    for (const wrapper of wrappers.splice(0))
      wrapper.unmount()
    if (lemonSqueezyDescriptor)
      Object.defineProperty(window, 'LemonSqueezy', lemonSqueezyDescriptor)
    else
      delete (window as any).LemonSqueezy
  })

  it('leaves the Carbon Ads root for Vue to remove', () => {
    const wrapper = mount(ScriptCarbonAds, {
      props: { serve: 'test', placement: 'test', format: 'cover' },
    })
    wrappers.push(wrapper)
    const removeRoot = vi.spyOn(wrapper.element, 'remove')

    wrapper.unmount()

    expect(removeRoot).not.toHaveBeenCalled()
  })

  it('fans Lemon Squeezy events out to every live component', () => {
    const first = mount(ScriptLemonSqueezy)
    const second = mount(ScriptLemonSqueezy)
    wrappers.push(first, second)
    const installedHandlers: Array<(event: any) => void> = []
    const api = {
      Refresh: vi.fn(),
      Setup: vi.fn(({ eventHandler }) => installedHandlers.push(eventHandler)),
    }
    Object.defineProperty(window, 'LemonSqueezy', {
      configurable: true,
      value: api,
    })

    mocks.loadedCallbacks[0]!(api)
    mocks.loadedCallbacks[1]!(api)
    installedHandlers.at(-1)!({ event: 'Checkout.Success', data: { order: 1 } })

    expect(first.emitted('lemonSqueezyEvent')).toHaveLength(1)
    expect(second.emitted('lemonSqueezyEvent')).toHaveLength(1)

    second.unmount()
    installedHandlers.at(-1)!({ event: 'Checkout.Success', data: { order: 2 } })

    expect(first.emitted('lemonSqueezyEvent')).toHaveLength(2)
    expect(second.emitted('lemonSqueezyEvent')).toHaveLength(1)
  })
})
