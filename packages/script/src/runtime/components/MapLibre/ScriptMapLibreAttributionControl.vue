<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import type { ScriptMapLibreAttributionControlProps } from './types'
import { inject } from 'vue'
import { MAPLIBRE_MAP_INJECTION_KEY, useMapLibreResource } from './useMapLibreResource'

// Renders no DOM of its own. A render function that returns `null` gives a
// comment node on the server and the client. A comment-only template does not:
// a production build strips the comment, so the server renders nothing and
// hydration reports a mismatch.
defineOptions({ render: () => null })

const props = defineProps<ScriptMapLibreAttributionControlProps>()

/**
 * `<ScriptMapLibreMap>` adds the default attribution control and shares it
 * through the map context. This component replaces that control, so the map
 * shows attribution once. Unmounting restores it, so required attribution never
 * disappears. Only public MapLibre APIs touch the control list.
 */
const defaultControl = inject(MAPLIBRE_MAP_INJECTION_KEY, undefined)?.defaultAttributionControl

/** The default control this component removed. Only this control is restored. */
let replaced: MapLibre.AttributionControl | undefined
/** A removed map has already dropped every control, and adding to it throws. */
let mapRemoved = false
function onMapRemove(): void {
  mapRemoved = true
}

function restore(map: MapLibre.Map): void {
  if (replaced && !mapRemoved && !map.hasControl(replaced))
    map.addControl(replaced)
  replaced = undefined
}

const control = useMapLibreResource<MapLibre.AttributionControl>({
  create({ maplibre, map }) {
    const builtIn = defaultControl?.value
    replaced = builtIn && map.hasControl(builtIn) ? builtIn : undefined
    // The component options override the options of the map default.
    // The credits of the map default stay unless the component sets its own.
    const inherited = replaced?.options
    const options = inherited || props.options
      ? { ...inherited, ...props.options, customAttribution: props.options?.customAttribution ?? inherited?.customAttribution }
      : undefined
    const instance = new maplibre.AttributionControl(options)
    map.on('remove', onMapRemove)
    if (replaced)
      map.removeControl(replaced)
    try {
      map.addControl(instance, props.position)
    }
    catch (error) {
      restore(map)
      map.off('remove', onMapRemove)
      throw error
    }
    return instance
  },
  cleanup(instance, { map }) {
    map.off('remove', onMapRemove)
    if (map.hasControl(instance))
      map.removeControl(instance)
    restore(map)
  },
})

defineExpose({ control })
</script>
