import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScriptPayPalButtons from '../../packages/script/src/runtime/components/ScriptPayPalButtons.vue'
import ScriptPayPalMessages from '../../packages/script/src/runtime/components/ScriptPayPalMessages.vue'

const mocks = vi.hoisted(() => ({
  status: { __v_isRef: true, value: 'awaitingLoad' },
  trigger: () => {},
  useScriptPayPal: vi.fn(),
  useScriptTriggerElement: vi.fn(),
}))

vi.mock('../../packages/script/src/runtime/composables/useScriptTriggerElement', () => ({
  useScriptTriggerElement: mocks.useScriptTriggerElement,
}))

vi.mock('../../packages/script/src/runtime/registry/paypal', () => ({
  useScriptPayPal: mocks.useScriptPayPal,
}))

describe('paypal component triggers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useScriptTriggerElement.mockReturnValue(mocks.trigger)
    mocks.useScriptPayPal.mockReturnValue({
      status: mocks.status,
      onLoaded: vi.fn(),
    })
  })

  it('passes the element trigger to the buttons script', async () => {
    await mountSuspended(ScriptPayPalButtons, {
      props: { trigger: 'visible' },
    })

    expect(mocks.useScriptPayPal).toHaveBeenCalledWith(expect.objectContaining({
      scriptOptions: expect.objectContaining({ trigger: mocks.trigger }),
    }))
  })

  it('passes the element trigger to the messages script', async () => {
    await mountSuspended(ScriptPayPalMessages, {
      props: { trigger: 'visible' },
    })

    expect(mocks.useScriptPayPal).toHaveBeenCalledWith(expect.objectContaining({
      scriptOptions: expect.objectContaining({ trigger: mocks.trigger }),
    }))
  })
})
