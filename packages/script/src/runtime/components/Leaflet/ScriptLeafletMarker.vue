<script setup lang="ts">
import type * as Leaflet from 'leaflet'
import { inject, onMounted, provide, watch } from 'vue'
import { bindLeafletEvents, LEAFLET_MAP_INJECTION_KEY, LEAFLET_MARKER_INJECTION_KEY, useLeafletResource } from './useLeafletResource'

const props = defineProps<{
  /** Reactive marker position. */
  position: Leaflet.LatLngExpression
  /** Unique text alternative for the marker icon. */
  alt?: string
  /** Tooltip text for the marker icon. */
  title?: string
  /** Options passed to `L.marker`. */
  options?: Leaflet.MarkerOptions
}>()

const emit = defineEmits<{
  click: [event: Leaflet.LeafletMouseEvent]
  dblclick: [event: Leaflet.LeafletMouseEvent]
  mousedown: [event: Leaflet.LeafletMouseEvent]
  mouseover: [event: Leaflet.LeafletMouseEvent]
  mouseout: [event: Leaflet.LeafletMouseEvent]
  contextmenu: [event: Leaflet.LeafletMouseEvent]
  dragstart: [event: Leaflet.DragEndEvent]
  drag: [event: Leaflet.LeafletEvent]
  dragend: [event: Leaflet.DragEndEvent]
  move: [event: Leaflet.LeafletEvent]
}>()

defineSlots<{
  default?: () => any
}>()

const mapContext = inject(LEAFLET_MAP_INJECTION_KEY, undefined)
const markerEvents = ['click', 'dblclick', 'mousedown', 'mouseover', 'mouseout', 'contextmenu', 'dragstart', 'drag', 'dragend', 'move'] as const

function markerOptions(): Leaflet.MarkerOptions {
  return {
    ...props.options,
    alt: props.alt ?? props.options?.alt,
    title: props.title ?? props.options?.title,
  }
}

const marker = useLeafletResource<Leaflet.Marker>({
  create({ leaflet, map }) {
    const instance = leaflet.marker(props.position, markerOptions())
    bindLeafletEvents(instance, emit as any, markerEvents)
    return instance.addTo(map)
  },
  cleanup(instance) {
    instance.off()
    instance.remove()
  },
})

provide(LEAFLET_MARKER_INJECTION_KEY, { marker })
defineExpose({ marker })

onMounted(() => {
  if (import.meta.dev && !props.alt && !props.options?.alt) {
    console.warn('[nuxt-scripts] <ScriptLeafletMarker> should have a unique `alt` for screen reader users.')
  }
})

watch(() => props.position, position => marker.value?.setLatLng(position), { deep: 1 })
watch(markerOptions, (options) => {
  if (!marker.value || !mapContext?.leaflet.value)
    return
  mapContext.leaflet.value.Util.setOptions(marker.value, options)
  if (options.icon)
    marker.value.setIcon(options.icon)
  if (options.opacity !== undefined)
    marker.value.setOpacity(options.opacity)
  if (options.zIndexOffset !== undefined)
    marker.value.setZIndexOffset(options.zIndexOffset)
  if (options.draggable === true)
    marker.value.dragging?.enable()
  else if (options.draggable === false)
    marker.value.dragging?.disable()
  const element = marker.value.getElement()
  if (element) {
    if (options.alt)
      element.setAttribute('alt', options.alt)
    else
      element.removeAttribute('alt')
    if (options.title)
      element.setAttribute('title', options.title)
    else
      element.removeAttribute('title')
  }
}, { deep: 2 })
</script>

<template>
  <slot />
</template>
