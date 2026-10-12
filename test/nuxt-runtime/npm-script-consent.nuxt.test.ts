import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, onUnmounted, unref } from 'vue'
import { useScriptPostHog, useScriptTriggerConsent } from '#imports'

const sdk = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn() }))
vi.mock('posthog-js', () => ({ default: { init: sdk.init } }))

describe('npm script consent', () => {
  it('keeps later consumers and queued events behind the first consent trigger', async () => {
    sdk.init.mockReturnValue({ capture: sdk.capture })
    let accept!: () => void
    const LaterConsumer = defineComponent({
      setup() {
        const script = useScriptPostHog()
        script.proxy.posthog.capture('after-consent')
        return () => h('p', { id: 'later' }, unref(script.status))
      },
    })
    const wrapper = await mountSuspended(defineComponent({
      setup() {
        const consent = useScriptTriggerConsent()
        const script = useScriptPostHog({ apiKey: 'phc_test', scriptOptions: { trigger: consent, skipValidation: true } })
        accept = () => consent.accept()
        onUnmounted(() => script.remove())
        return () => h('div', [h('p', { id: 'first' }, unref(script.status)), h(LaterConsumer)])
      },
    }))
    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(sdk.init).not.toHaveBeenCalled()
      expect(sdk.capture).not.toHaveBeenCalled()
      expect(wrapper.find('#first').text()).toBe('awaitingLoad')
      expect(wrapper.find('#later').text()).toBe('awaitingLoad')
      accept()
      await expect.poll(() => wrapper.find('#first').text()).toBe('loaded')
      expect(wrapper.find('#later').text()).toBe('loaded')
      expect(sdk.init).toHaveBeenCalledTimes(1)
      expect(sdk.capture).toHaveBeenCalledWith('after-consent')
    }
    finally {
      wrapper.unmount()
      delete window.posthog
      delete window.__posthogInitPromise
      delete window._posthogQueue
    }
  })
})
