import type {
  ScriptMapLibreGeoJsonEmits,
  ScriptMapLibreGeoJsonLayer,
  ScriptMapLibreMapExpose,
  ScriptMapLibreMapProps,
} from '@nuxt/scripts'
import type {
  ScriptMapLibreGeoJsonLayer as RuntimeLayer,
} from '#nuxt-scripts/types'
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

    expectTypeOf<ScriptMapLibreGeoJsonLayer>().not.toBeAny()
    expectTypeOf(layers[0]!.id).toEqualTypeOf<string>()
    // the component supplies the source, so it must stay optional
    expectTypeOf(layers[0]!.source).toEqualTypeOf<string | undefined>()
  })

  it('accepts a source-less layer only when a GeoJSON source can render it', () => {
    // MapLibre's own style validation rejects these three on a GeoJSON source:
    // `hillshade` and `color-relief` need a `raster-dem` source and `raster`
    // needs raster tiles. `background` takes no source at all.
    // @ts-expect-error a hillshade layer must name its own raster-dem source
    const hillshade: ScriptMapLibreGeoJsonLayer = { id: 'terrain', type: 'hillshade' }
    // @ts-expect-error a background layer never belongs to a source
    const background: ScriptMapLibreGeoJsonLayer = { id: 'backdrop', type: 'background' }
    // an explicit external source stays valid
    const raster: ScriptMapLibreGeoJsonLayer = { id: 'satellite', type: 'raster', source: 'imagery' }

    expectTypeOf(hillshade).not.toBeAny()
    expectTypeOf(background).not.toBeAny()
    expectTypeOf(raster).not.toBeAny()
  })

  it('exposes the same layer type from `#nuxt-scripts/types`', () => {
    expectTypeOf<RuntimeLayer>().toEqualTypeOf<ScriptMapLibreGeoJsonLayer>()
  })

  it('types the camera helpers on the ready payload', () => {
    expectTypeOf<ScriptMapLibreMapExpose['fitBounds']>().returns.toEqualTypeOf<void>()
    expectTypeOf<ScriptMapLibreMapExpose['easeTo']>().parameter(0).not.toBeAny()
    expectTypeOf<ScriptMapLibreMapExpose['flyTo']>().parameter(0).not.toBeAny()
  })

  it('makes center optional only when bounds frames the camera', () => {
    // PC-16: a map framed on its data should not need a computed center.
    const framed: ScriptMapLibreMapProps = { mapStyle: 'https://example.com/style.json', bounds: [[144, -44], [149, -39]] }
    const centered: ScriptMapLibreMapProps = { mapStyle: 'https://example.com/style.json', center: [146, -42] }
    const both: ScriptMapLibreMapProps = { mapStyle: 'https://example.com/style.json', center: [146, -42], bounds: [144, -44, 149, -39], fitBoundsOptions: { padding: 40 } }
    // A maybe-missing bounds value stays valid next to a center.
    const maybeBounds = undefined as [number, number, number, number] | undefined
    const optionalBounds: ScriptMapLibreMapProps = { mapStyle: 'https://example.com/style.json', center: [146, -42], bounds: maybeBounds }
    // @ts-expect-error the map needs center or bounds to frame its first camera
    const neither: ScriptMapLibreMapProps = { mapStyle: 'https://example.com/style.json' }

    expectTypeOf(framed).not.toBeAny()
    expectTypeOf(centered).not.toBeAny()
    expectTypeOf(both).not.toBeAny()
    expectTypeOf(optionalBounds).not.toBeAny()
    expectTypeOf(neither).not.toBeAny()
  })

  it('types the layer event payloads', () => {
    expectTypeOf<ScriptMapLibreGeoJsonEmits['click'][0]>().not.toBeAny()
    expectTypeOf<ScriptMapLibreGeoJsonEmits['error'][0]>().toEqualTypeOf<Error>()
  })
})
