<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import { onMounted, provide, watch } from 'vue'
import { MAPLIBRE_MARKER_INJECTION_KEY, useMapLibreResource } from './useMapLibreResource'

const props = defineProps<{
  /** Reactive marker position in `[longitude, latitude]` order. */
  position: MapLibre.LngLatLike
  /** Accessible name for the marker element. */
  ariaLabel?: string
  /** Tooltip text for the marker element. */
  title?: string
  /** Options passed to `new maplibregl.Marker()`. */
  options?: MapLibre.MarkerOptions
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
  dragstart: [event: MapLibre.Event]
  drag: [event: MapLibre.Event]
  dragend: [event: MapLibre.Event]
}>()

defineSlots<{
  default?: () => any
}>()

let clickHandler: ((event: MouseEvent) => void) | undefined
const dragStartHandler = (event: MapLibre.Event) => emit('dragstart', event)
const dragHandler = (event: MapLibre.Event) => emit('drag', event)
const dragEndHandler = (event: MapLibre.Event) => emit('dragend', event)

function syncMarkerElement(instance: MapLibre.Marker): void {
  const element = instance.getElement()
  if (props.ariaLabel) {
    element.setAttribute('aria-label', props.ariaLabel)
    element.setAttribute('role', 'img')
  }
  else {
    element.removeAttribute('aria-label')
    element.removeAttribute('role')
  }
  if (props.title)
    element.setAttribute('title', props.title)
  else
    element.removeAttribute('title')
}

const marker = useMapLibreResource<MapLibre.Marker>({
  create({ maplibre, map }) {
    const instance = new maplibre.Marker(props.options).setLngLat(props.position).addTo(map)
    instance.on('dragstart', dragStartHandler)
    instance.on('drag', dragHandler)
    instance.on('dragend', dragEndHandler)
    clickHandler = event => emit('click', event)
    instance.getElement().addEventListener('click', clickHandler)
    syncMarkerElement(instance)
    return instance
  },
  cleanup(instance) {
    if (clickHandler)
      instance.getElement().removeEventListener('click', clickHandler)
    clickHandler = undefined
    instance.off('dragstart', dragStartHandler)
    instance.off('drag', dragHandler)
    instance.off('dragend', dragEndHandler)
    instance.remove()
  },
})

provide(MAPLIBRE_MARKER_INJECTION_KEY, { marker })
defineExpose({ marker })

onMounted(() => {
  if (import.meta.dev && !props.ariaLabel)
    console.warn('[nuxt-scripts] <ScriptMapLibreMarker> should have a unique `aria-label` for screen reader users.')
})

watch(() => props.position, position => marker.value?.setLngLat(position), { deep: 1 })
watch(() => props.ariaLabel, () => marker.value && syncMarkerElement(marker.value))
watch(() => props.title, () => marker.value && syncMarkerElement(marker.value))
watch(() => props.options, (options) => {
  if (!marker.value || !options)
    return
  marker.value.setDraggable(options.draggable)
  marker.value.setRotation(options.rotation)
  marker.value.setRotationAlignment(options.rotationAlignment)
  marker.value.setPitchAlignment(options.pitchAlignment)
  if (options.offset)
    marker.value.setOffset(options.offset)
  if (options.opacity !== undefined)
    marker.value.getElement().style.opacity = String(options.opacity)
}, { deep: 2 })
</script>

<template>
  <slot />
</template>
