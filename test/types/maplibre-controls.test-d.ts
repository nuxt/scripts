import type {
  ScriptMapLibreAttributionControlProps,
  ScriptMapLibreFullscreenControlEmits,
  ScriptMapLibreFullscreenControlProps,
  ScriptMapLibreGeolocateControlEmits,
  ScriptMapLibreGeolocateControlProps,
  ScriptMapLibreScaleControlProps,
} from '@nuxt/scripts'
import { describe, expectTypeOf, it } from 'vitest'

/**
 * PC-15: the control components need public prop and emit types, so a consumer
 * can type options and handlers without a deep import. These come from the
 * package entry only, so a missing export fails this file.
 */
describe('mapLibre control types', () => {
  it('types the control options from the MapLibre constructors', () => {
    const scale: ScriptMapLibreScaleControlProps = { position: 'bottom-left', options: { unit: 'metric', maxWidth: 120 } }
    const geolocate: ScriptMapLibreGeolocateControlProps = { options: { trackUserLocation: true, positionOptions: { enableHighAccuracy: true } } }
    const fullscreen: ScriptMapLibreFullscreenControlProps = { position: 'top-left', options: { pseudo: true } }
    const attribution: ScriptMapLibreAttributionControlProps = { options: { compact: false, customAttribution: ['Data: Tasmania'] } }

    // @ts-expect-error ScaleControl accepts only imperial, metric or nautical
    const badUnit: ScriptMapLibreScaleControlProps = { options: { unit: 'furlong' } }
    // @ts-expect-error a control position names a map corner
    const badPosition: ScriptMapLibreFullscreenControlProps = { position: 'middle' }

    expectTypeOf(scale).not.toBeAny()
    expectTypeOf(geolocate).not.toBeAny()
    expectTypeOf(fullscreen).not.toBeAny()
    expectTypeOf(attribution).not.toBeAny()
    expectTypeOf(badUnit).not.toBeAny()
    expectTypeOf(badPosition).not.toBeAny()
  })

  it('types the geolocate event payloads', () => {
    expectTypeOf<ScriptMapLibreGeolocateControlEmits['geolocate'][0]['coords']>().toEqualTypeOf<GeolocationCoordinates>()
    expectTypeOf<ScriptMapLibreGeolocateControlEmits['error'][0]['code']>().toEqualTypeOf<number>()
    expectTypeOf<ScriptMapLibreGeolocateControlEmits['unavailable'][0]>().toEqualTypeOf<'unsupported' | 'permission-denied'>()
  })

  it('types the fullscreen event payloads', () => {
    expectTypeOf<ScriptMapLibreFullscreenControlEmits['fullscreenstart'][0]>().not.toBeAny()
    expectTypeOf<ScriptMapLibreFullscreenControlEmits['fullscreenend'][0]['type']>().toEqualTypeOf<'fullscreenstart' | 'fullscreenend'>()
  })
})
