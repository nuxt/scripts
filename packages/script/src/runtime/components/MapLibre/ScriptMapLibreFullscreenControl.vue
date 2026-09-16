<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import type { ScriptMapLibreFullscreenControlEmits, ScriptMapLibreFullscreenControlProps } from './types'
import { useMapLibreResource } from './useMapLibreResource'

// Renders no DOM of its own. A render function that returns `null` gives a
// comment node on the server and the client. A comment-only template does not:
// a production build strips the comment, so the server renders nothing and
// hydration reports a mismatch.
defineOptions({ render: () => null })

const props = defineProps<ScriptMapLibreFullscreenControlProps>()

const emit = defineEmits<ScriptMapLibreFullscreenControlEmits>()

const onFullscreenStart = (event: MapLibre.FullscreenControlEventType['fullscreenstart']) => emit('fullscreenstart', event)
const onFullscreenEnd = (event: MapLibre.FullscreenControlEventType['fullscreenend']) => emit('fullscreenend', event)

const control = useMapLibreResource<MapLibre.FullscreenControl>({
  create({ maplibre, map }) {
    const instance = new maplibre.FullscreenControl(props.options)
    instance.on('fullscreenstart', onFullscreenStart)
    instance.on('fullscreenend', onFullscreenEnd)
    map.addControl(instance, props.position)
    return instance
  },
  cleanup(instance, { map }) {
    instance.off('fullscreenstart', onFullscreenStart)
    instance.off('fullscreenend', onFullscreenEnd)
    if (map.hasControl(instance))
      map.removeControl(instance)
  },
})

defineExpose({ control })
</script>
