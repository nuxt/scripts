<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import type { ScriptMapLibreNavigationControlProps } from './types'
import { useMapLibreResource } from './useMapLibreResource'

// Renders no DOM of its own. A render function that returns `null` gives a
// comment node on the server and the client. A comment-only template does not:
// a production build strips the comment, so the server renders nothing and
// hydration reports a mismatch.
defineOptions({ render: () => null })

const props = defineProps<ScriptMapLibreNavigationControlProps>()

const control = useMapLibreResource<MapLibre.NavigationControl>({
  create({ maplibre, map }) {
    const instance = new maplibre.NavigationControl(props.options)
    map.addControl(instance, props.position)
    return instance
  },
  cleanup(instance, { map }) {
    if (map.hasControl(instance))
      map.removeControl(instance)
  },
})

defineExpose({ control })
</script>
