/**
 * @vitest-environment happy-dom
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onBeforeUnmount, provide, shallowRef } from 'vue'
import { LEAFLET_MAP_INJECTION_KEY, useLeafletResource } from '../../packages/script/src/runtime/components/Leaflet/useLeafletResource'

function createProvider(immediate = true, clearBeforeChildren = false) {
  const map = shallowRef<any>(immediate ? { id: 'map' } : undefined)
  const leaflet = shallowRef<any>(immediate ? { version: '1.9.4' } : undefined)

  const Provider = defineComponent({
    setup(_, { slots }) {
      provide(LEAFLET_MAP_INJECTION_KEY, { map, leaflet })
      if (clearBeforeChildren) {
        onBeforeUnmount(() => {
          map.value = undefined
          leaflet.value = undefined
        })
      }
      return () => h('div', slots.default?.())
    },
  })

  return { Provider, map, leaflet }
}

describe('useLeafletResource', () => {
  it('creates a resource after the map becomes ready', async () => {
    const { Provider, map, leaflet } = createProvider(false)
    const create = vi.fn(() => ({ id: 'marker' }))

    const Child = defineComponent({
      setup() {
        return { resource: useLeafletResource({ create, cleanup: vi.fn() }) }
      },
      render: () => h('span'),
    })

    const wrapper = mount(Provider, { slots: { default: () => h(Child) } })
    await nextTick()
    expect(create).not.toHaveBeenCalled()

    map.value = { id: 'map' }
    leaflet.value = { version: '1.9.4' }
    await nextTick()

    expect(create).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('cleans up from its captured context even when the parent clears refs first', async () => {
    const { Provider } = createProvider(true, true)
    const resource = { id: 'tile-layer' }
    const cleanup = vi.fn()

    const Child = defineComponent({
      setup() {
        useLeafletResource({ create: () => resource, cleanup })
        return () => h('span')
      },
    })

    const wrapper = mount(Provider, { slots: { default: () => h(Child) } })
    await nextTick()
    wrapper.unmount()

    expect(cleanup).toHaveBeenCalledWith(resource, {
      map: { id: 'map' },
      leaflet: { version: '1.9.4' },
    })
  })

  it('waits for an additional DOM readiness condition', async () => {
    const { Provider } = createProvider()
    const ready = shallowRef(false)
    const create = vi.fn(() => ({ id: 'popup' }))

    const Child = defineComponent({
      setup() {
        useLeafletResource({ ready: () => ready.value, create, cleanup: vi.fn() })
        return () => h('span')
      },
    })

    const wrapper = mount(Provider, { slots: { default: () => h(Child) } })
    await nextTick()
    expect(create).not.toHaveBeenCalled()

    ready.value = true
    await nextTick()
    expect(create).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
