import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import ScriptCrisp from '../../packages/script/src/runtime/components/ScriptCrisp.vue'
import ScriptIntercom from '../../packages/script/src/runtime/components/ScriptIntercom.vue'
import ScriptLemonSqueezy from '../../packages/script/src/runtime/components/ScriptLemonSqueezy.vue'

const mocks = vi.hoisted(() => ({
  crispStatus: { __v_isRef: true, value: 'loaded' },
  intercomStatus: { __v_isRef: true, value: 'loaded' },
  lemonLoadedCallbacks: [] as Array<(api: any) => void>,
  lemonRefresh: vi.fn(),
  lemonSetup: vi.fn(),
  useScriptCrisp: vi.fn(),
  useScriptIntercom: vi.fn(),
  useScriptLemonSqueezy: vi.fn(),
  useScriptTriggerElement: vi.fn(() => () => {}),
}))

vi.mock('../../packages/script/src/runtime/composables/useScriptTriggerElement', () => ({
  useScriptTriggerElement: mocks.useScriptTriggerElement,
}))

vi.mock('../../packages/script/src/runtime/registry/crisp', () => ({
  useScriptCrisp: mocks.useScriptCrisp,
}))

vi.mock('../../packages/script/src/runtime/registry/intercom', () => ({
  useScriptIntercom: mocks.useScriptIntercom,
}))

vi.mock('../../packages/script/src/runtime/registry/lemon-squeezy', () => ({
  useScriptLemonSqueezy: mocks.useScriptLemonSqueezy,
}))

describe('chat component lifecycle', () => {
  beforeEach(() => {
    mocks.crispStatus.value = 'loaded'
    mocks.intercomStatus.value = 'loaded'
    mocks.useScriptCrisp.mockReturnValue({
      status: mocks.crispStatus,
      onLoaded: vi.fn(),
    })
    mocks.useScriptIntercom.mockReturnValue({
      status: mocks.intercomStatus,
      onLoaded: vi.fn(),
    })
    mocks.lemonLoadedCallbacks.length = 0
    mocks.useScriptLemonSqueezy.mockReturnValue({
      onLoaded: (callback: (api: any) => void) => {
        mocks.lemonLoadedCallbacks.push(callback)
      },
    })
    ;(window as any).LemonSqueezy = {
      Setup: mocks.lemonSetup,
    }
  })

  afterEach(() => {
    document.getElementById('crisp-chatbox')?.remove()
    document.getElementById('intercom-frame')?.remove()
    delete (window as any).LemonSqueezy
    vi.clearAllMocks()
  })

  it('recognizes Crisp when mounting after the shared SDK is ready', async () => {
    const chatbox = document.createElement('div')
    chatbox.id = 'crisp-chatbox'
    document.body.append(chatbox)

    const wrapper = await mountSuspended(ScriptCrisp, {
      props: { id: 'website-id', trigger: 'visible' },
      slots: {
        loading: () => h('span', { 'data-testid': 'loading' }),
      },
    })
    await nextTick()

    expect(wrapper.emitted('ready')).toHaveLength(1)
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)
  })

  it('recognizes Intercom when mounting after the shared SDK is ready', async () => {
    const frame = document.createElement('iframe')
    frame.id = 'intercom-frame'
    document.body.append(frame)

    const wrapper = await mountSuspended(ScriptIntercom, {
      props: { appId: 'app-id', trigger: 'visible' },
      slots: {
        loading: () => h('span', { 'data-testid': 'loading' }),
      },
    })
    await nextTick()

    expect(wrapper.emitted('ready')).toHaveLength(1)
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)
  })

  it('renders and emits Crisp errors', async () => {
    mocks.crispStatus.value = 'error'

    const wrapper = await mountSuspended(ScriptCrisp, {
      props: { id: 'website-id', trigger: 'visible' },
      slots: {
        error: () => h('span', { 'data-testid': 'error' }),
        loading: () => h('span', { 'data-testid': 'loading' }),
      },
    })
    await nextTick()

    expect(wrapper.emitted('error')).toHaveLength(1)
    expect(wrapper.find('[data-testid="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)
  })

  it('renders and emits Intercom errors', async () => {
    mocks.intercomStatus.value = 'error'

    const wrapper = await mountSuspended(ScriptIntercom, {
      props: { appId: 'app-id', trigger: 'visible' },
      slots: {
        error: () => h('span', { 'data-testid': 'error' }),
        loading: () => h('span', { 'data-testid': 'loading' }),
      },
    })
    await nextTick()

    expect(wrapper.emitted('error')).toHaveLength(1)
    expect(wrapper.find('[data-testid="error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(false)
  })

  it('restores the previous Lemon Squeezy event owner', async () => {
    const first = await mountSuspended(ScriptLemonSqueezy)
    const second = await mountSuspended(ScriptLemonSqueezy)
    const api = {
      Refresh: mocks.lemonRefresh,
      Setup: mocks.lemonSetup,
    }

    mocks.lemonLoadedCallbacks[0]?.(api)
    mocks.lemonLoadedCallbacks[1]?.(api)
    const firstHandler = mocks.lemonSetup.mock.calls[0]?.[0].eventHandler

    second.unmount()

    expect(mocks.lemonSetup).toHaveBeenLastCalledWith({ eventHandler: firstHandler })
    first.unmount()
  })
})
