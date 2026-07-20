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
  /** Options passed to `new maplibregl.Marker()`. Options with public setters also update reactively. */
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
let markerClassNames = new Set((props.options?.className || '').split(/\s+/).filter(Boolean))
let fallbackAriaLabel: string | null = null
const dragStartHandler = (event: MapLibre.Event) => emit('dragstart', event)
const dragHandler = (event: MapLibre.Event) => emit('drag', event)
const dragEndHandler = (event: MapLibre.Event) => emit('dragend', event)

function syncMarkerElement(instance: MapLibre.Marker): void {
  const element = instance.getElement()
  if (props.ariaLabel)
    element.setAttribute('aria-label', props.ariaLabel)
  else if (fallbackAriaLabel)
    element.setAttribute('aria-label', fallbackAriaLabel)
  else
    element.removeAttribute('aria-label')
  if (props.title)
    element.setAttribute('title', props.title)
  else
    element.removeAttribute('title')
}

const marker = useMapLibreResource<MapLibre.Marker>({
  create({ maplibre, map }) {
    const instance = new maplibre.Marker(props.options).setLngLat(props.position).addTo(map)
    markerClassNames = new Set((props.options?.className || '').split(/\s+/).filter(Boolean))
    fallbackAriaLabel = instance.getElement().getAttribute('aria-label')
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
    fallbackAriaLabel = null
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
  if (options.draggable !== undefined)
    marker.value.setDraggable(options.draggable)
  if (options.rotation !== undefined)
    marker.value.setRotation(options.rotation)
  if (options.rotationAlignment !== undefined)
    marker.value.setRotationAlignment(options.rotationAlignment)
  if (options.pitchAlignment !== undefined)
    marker.value.setPitchAlignment(options.pitchAlignment)
  if (options.offset !== undefined)
    marker.value.setOffset(options.offset)
  if (options.opacity !== undefined || options.opacityWhenCovered !== undefined)
    marker.value.setOpacity(options.opacity, options.opacityWhenCovered)
  if (options.subpixelPositioning !== undefined)
    marker.value.setSubpixelPositioning(options.subpixelPositioning)
  if (options.className !== undefined) {
    const nextClassNames = new Set(options.className.split(/\s+/).filter(Boolean))
    for (const className of markerClassNames) {
      if (!nextClassNames.has(className))
        marker.value.removeClassName(className)
    }
    for (const className of nextClassNames) {
      if (!markerClassNames.has(className))
        marker.value.addClassName(className)
    }
    markerClassNames = nextClassNames
  }
}, { deep: 2 })
</script>

<template>
  <slot />
</template>
