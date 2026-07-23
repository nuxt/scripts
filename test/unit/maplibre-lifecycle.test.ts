/**
 * @vitest-environment happy-dom
 */
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onBeforeUnmount, provide, shallowRef } from 'vue'
import { MAPLIBRE_MAP_INJECTION_KEY, useMapLibreResource } from '../../packages/script/src/runtime/components/MapLibre/useMapLibreResource'

function createProvider(immediate = true, clearBeforeChildren = false) {
  const map = shallowRef<any>(immediate ? { id: 'map' } : undefined)
  const maplibre = shallowRef<any>(immediate ? { version: '5.24.0' } : undefined)

  const Provider = defineComponent({
    setup(_, { slots }) {
      provide(MAPLIBRE_MAP_INJECTION_KEY, { map, maplibre })
      if (clearBeforeChildren) {
        onBeforeUnmount(() => {
          map.value = undefined
          maplibre.value = undefined
        })
      }
      return () => h('div', slots.default?.())
    },
  })

  return { Provider, map, maplibre }
}

describe('useMapLibreResource', () => {
  it('creates a resource after the map becomes ready', async () => {
    const { Provider, map, maplibre } = createProvider(false)
    const create = vi.fn(() => ({ id: 'marker' }))

    const Child = defineComponent({
      setup() {
        return { resource: useMapLibreResource({ create, cleanup: vi.fn() }) }
      },
      render: () => h('span'),
    })

    const wrapper = mount(Provider, { slots: { default: () => h(Child) } })
    await nextTick()
    expect(create).not.toHaveBeenCalled()

    map.value = { id: 'map' }
    maplibre.value = { version: '5.24.0' }
    await nextTick()

    expect(create).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('cleans up from its captured context after the parent clears refs', async () => {
    const { Provider } = createProvider(true, true)
    const resource = { id: 'control' }
    const cleanup = vi.fn()

    const Child = defineComponent({
      setup() {
        useMapLibreResource({ create: () => resource, cleanup })
        return () => h('span')
      },
    })

    const wrapper = mount(Provider, { slots: { default: () => h(Child) } })
    await nextTick()
    wrapper.unmount()

    expect(cleanup).toHaveBeenCalledWith(resource, {
      map: { id: 'map' },
      maplibre: { version: '5.24.0' },
    })
  })
})
