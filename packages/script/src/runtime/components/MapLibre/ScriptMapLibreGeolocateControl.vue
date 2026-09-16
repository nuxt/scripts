<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import type { ScriptMapLibreGeolocateControlEmits, ScriptMapLibreGeolocateControlProps } from './types'
import { useMapLibreResource } from './useMapLibreResource'

// Renders no DOM of its own. A render function that returns `null` gives a
// comment node on the server and the client. A comment-only template does not:
// a production build strips the comment, so the server renders nothing and
// hydration reports a mismatch.
defineOptions({ render: () => null })

const props = defineProps<ScriptMapLibreGeolocateControlProps>()

const emit = defineEmits<ScriptMapLibreGeolocateControlEmits>()

type GeolocateEvents = MapLibre.GeolocateControlEventType

const listeners = {
  geolocate: (event: GeolocateEvents['geolocate']) => emit('geolocate', event),
  error: (event: GeolocateEvents['error']) => emit('error', event),
  outofmaxbounds: (event: GeolocateEvents['outofmaxbounds']) => emit('outofmaxbounds', event),
  trackuserlocationstart: (event: GeolocateEvents['trackuserlocationstart']) => emit('trackuserlocationstart', event),
  trackuserlocationend: (event: GeolocateEvents['trackuserlocationend']) => emit('trackuserlocationend', event),
  userlocationfocus: (event: GeolocateEvents['userlocationfocus']) => emit('userlocationfocus', event),
  userlocationlostfocus: (event: GeolocateEvents['userlocationlostfocus']) => emit('userlocationlostfocus', event),
} satisfies { [K in keyof GeolocateEvents]: (event: GeolocateEvents[K]) => void }

const eventNames = Object.keys(listeners) as (keyof typeof listeners)[]

/**
 * MapLibre runs this same check when the control loads. A failed check only
 * disables the button and logs a warning, so the component reports it.
 */
async function readAvailability(): Promise<'available' | 'unsupported' | 'permission-denied'> {
  if (!('geolocation' in navigator))
    return 'unsupported'
  if (!navigator.permissions)
    return 'available'
  const status = await navigator.permissions.query({ name: 'geolocation' }).catch(() => {
    // Safe to ignore: some browsers reject this query. MapLibre then trusts `navigator.geolocation`, and so does the component.
    return undefined
  })
  return status?.state === 'denied' ? 'permission-denied' : 'available'
}

const control = useMapLibreResource<MapLibre.GeolocateControl>({
  create({ maplibre, map }) {
    const instance = new maplibre.GeolocateControl(props.options ?? {})
    for (const name of eventNames)
      instance.on(name, listeners[name] as (event: unknown) => void)
    map.addControl(instance, props.position)
    readAvailability().then((availability) => {
      if (availability !== 'available' && control.value === instance)
        emit('unavailable', availability)
    })
    return instance
  },
  cleanup(instance, { map }) {
    for (const name of eventNames)
      instance.off(name, listeners[name] as (event: unknown) => void)
    if (map.hasControl(instance))
      map.removeControl(instance)
  },
})

defineExpose({ control })
</script>
