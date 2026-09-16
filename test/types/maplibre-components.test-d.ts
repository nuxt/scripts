import type {
  ScriptMapLibreGeoJsonEmits,
  ScriptMapLibreGeoJsonLayer,
  ScriptMapLibreMapExpose,
} from '../../packages/script/src/module'
import type {
  ScriptMapLibreGeoJsonLayer as RuntimeLayer,
} from '../../packages/script/src/runtime/types'
import { describe, expectTypeOf, it } from 'vitest'

/**
 * PC-2: the MapLibre component types were declared inside the SFCs and had no
 * public route. A consumer needs them to type a module-level layer array and a
 * template ref, so they are exported from both public type entries.
 */
describe('mapLibre component types', () => {
  it('types a module-level layer array from the package entry', () => {
    const layers: ScriptMapLibreGeoJsonLayer[] = [
      {
        id: 'clusters',
        type: 'circle',
        paint: { 'circle-color': '#396cb2' },
      },
      {
        id: 'cluster-count',
        type: 'symbol',
        layout: { 'text-field': '{point_count_abbreviated}' },
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
