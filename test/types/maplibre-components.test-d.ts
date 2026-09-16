import type {
  ScriptMapLibreGeoJsonLayer as RuntimeLayer,
} from '#nuxt-scripts/types'
import type {
  ScriptMapLibreGeoJsonEmits,
  ScriptMapLibreGeoJsonLayer,
  ScriptMapLibreMapExpose,
} from '../../packages/script/src/module'
import { describe, expectTypeOf, it } from 'vitest'

/**
 * PC-2: the MapLibre component types were declared inside the SFCs and had no
 * public route. A consumer needs them to type a module-level layer array and a
 * template ref, so they are exported from both public type entries.
 */
describe('mapLibre component types', () => {
  it('types the standard clustering layers from the package entry', () => {
    // PC-8: `Omit` is not distributive, so it collapsed the `LayerSpecification`
    // union to its common keys and dropped `filter`. Every clustering example
    // needs `filter`, and the expressions need per-layer contextual typing.
    const layers: ScriptMapLibreGeoJsonLayer[] = [
      {
        id: 'clusters',
        type: 'circle',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 100, '#f1f075'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 100, 30],
        },
      },
      {
        id: 'cluster-count',
        type: 'symbol',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
        },
      },
      {
        id: 'unclustered-point',
        type: 'circle',
        filter: ['!', ['has', 'point_count']],
        paint: { 'circle-color': '#396cb2' },
      },
    ]

    expectTypeOf(layers[0]!.id).toEqualTypeOf<string>()
    // the component supplies the source, so it must stay optional
    expectTypeOf(layers[0]!.source).toEqualTypeOf<string | undefined>()
  })

  it('exposes the same layer type from `#nuxt-scripts/types`', () => {
    expectTypeOf<RuntimeLayer>().toEqualTypeOf<ScriptMapLibreGeoJsonLayer>()
  })

  it('types the camera helpers on the ready payload', () => {
    expectTypeOf<ScriptMapLibreMapExpose['fitBounds']>().returns.toEqualTypeOf<void>()
    expectTypeOf<ScriptMapLibreMapExpose['easeTo']>().parameter(0).not.toBeAny()
    expectTypeOf<ScriptMapLibreMapExpose['flyTo']>().parameter(0).not.toBeAny()
  })

  it('types the layer event payloads', () => {
    expectTypeOf<ScriptMapLibreGeoJsonEmits['click'][0]>().not.toBeAny()
    expectTypeOf<ScriptMapLibreGeoJsonEmits['error'][0]>().toEqualTypeOf<Error>()
  })
})
