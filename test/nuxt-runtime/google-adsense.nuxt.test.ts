import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScriptGoogleAdsense from '../../packages/script/src/runtime/components/ScriptGoogleAdsense.vue'

const mocks = vi.hoisted(() => ({
  status: { __v_isRef: true, value: 'loaded' },
  useScriptGoogleAdsense: vi.fn(),
  useScriptTriggerElement: vi.fn(() => () => {}),
}))

vi.mock('../../packages/script/src/runtime/composables/useScriptTriggerElement', () => ({
  useScriptTriggerElement: mocks.useScriptTriggerElement,
}))

vi.mock('../../packages/script/src/runtime/registry/google-adsense', () => ({
  useScriptGoogleAdsense: mocks.useScriptGoogleAdsense,
}))

describe('google adsense component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useScriptGoogleAdsense.mockReturnValue({ status: mocks.status })
    window.adsbygoogle = []
  })

  it('renders the in-feed layout key on the ad unit', async () => {
    const wrapper = await mountSuspended(ScriptGoogleAdsense, {
      props: {
        dataAdClient: 'ca-pub-123',
        dataAdSlot: '456',
        dataAdFormat: 'fluid',
        dataAdLayoutKey: '-6t+ed+2i-1n-4w',
      },
    })

    expect(wrapper.get('ins').attributes('data-ad-layout-key')).toBe('-6t+ed+2i-1n-4w')
  })
})
