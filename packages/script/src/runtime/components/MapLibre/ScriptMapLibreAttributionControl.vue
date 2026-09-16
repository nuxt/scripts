<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import type { ScriptMapLibreAttributionControlProps } from './types'
import { useMapLibreResource } from './useMapLibreResource'

// Renders no DOM of its own. A render function that returns `null` gives a
// comment node on the server and the client. A comment-only template does not:
// a production build strips the comment, so the server renders nothing and
// hydration reports a mismatch.
defineOptions({ render: () => null })

const props = defineProps<ScriptMapLibreAttributionControlProps>()

/**
 * MapLibre adds its own attribution control unless the map sets
 * `attributionControl: false`. This component replaces that control, so the
 * map shows attribution once. Unmounting restores the replaced control, so
 * required attribution never disappears.
 */
let replaced: MapLibre.AttributionControl[] = []

function restore(map: MapLibre.Map): void {
  for (const existing of replaced) {
    if (!map.hasControl(existing))
      map.addControl(existing)
  }
  replaced = []
}

function mergeCredits(controls: MapLibre.AttributionControl[]): string[] | undefined {
  const credits = [...new Set(controls.flatMap(existing => existing.options.customAttribution ?? []))]
  return credits.length ? credits : undefined
}

const control = useMapLibreResource<MapLibre.AttributionControl>({
  create({ maplibre, map }) {
    // `_controls` is the list that `hasControl()` reads. `filter` copies it before removal.
    replaced = map._controls.filter((existing): existing is MapLibre.AttributionControl => existing instanceof maplibre.AttributionControl)
    // The component options override the map's `attributionControl` options.
    // Credits from every replaced control stay unless the component sets its own.
    const inherited = replaced[0]?.options
    const options = inherited || props.options
      ? { ...inherited, ...props.options, customAttribution: props.options?.customAttribution ?? mergeCredits(replaced) }
      : undefined
    const instance = new maplibre.AttributionControl(options)
    for (const existing of replaced)
      map.removeControl(existing)
    try {
      map.addControl(instance, props.position)
    }
    catch (error) {
      restore(map)
      throw error
    }
    return instance
  },
  cleanup(instance, { map }) {
    if (map.hasControl(instance))
      map.removeControl(instance)
    // A removed map has already dropped every control, and adding to it throws.
    if (map._removed)
      replaced = []
    else
      restore(map)
  },
})

defineExpose({ control })
</script>
