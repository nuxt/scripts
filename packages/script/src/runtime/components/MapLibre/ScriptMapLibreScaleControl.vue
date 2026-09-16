<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import type { ScriptMapLibreScaleControlProps } from './types'
import { watch } from 'vue'
import { useMapLibreResource } from './useMapLibreResource'

// Renders no DOM of its own. A render function that returns `null` gives a
// comment node on the server and the client. A comment-only template does not:
// a production build strips the comment, so the server renders nothing and
// hydration reports a mismatch.
defineOptions({ render: () => null })

const props = defineProps<ScriptMapLibreScaleControlProps>()

const control = useMapLibreResource<MapLibre.ScaleControl>({
  create({ maplibre, map }) {
    const instance = new maplibre.ScaleControl(props.options)
    map.addControl(instance, props.position)
    return instance
  },
  cleanup(instance, { map }) {
    if (map.hasControl(instance))
      map.removeControl(instance)
  },
})

watch(() => props.options?.unit, (unit) => {
  if (control.value && unit)
    control.value.setUnit(unit)
})

defineExpose({ control })
</script>
