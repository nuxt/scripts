<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import { inject, useTemplateRef, watch } from 'vue'
import { MAPLIBRE_MARKER_INJECTION_KEY, useMapLibreResource } from './useMapLibreResource'

const props = withDefaults(defineProps<{
  /** Position for a standalone popup. Omit when nested inside a marker. */
  position?: MapLibre.LngLatLike
  /** Whether the popup is open. @default false */
  open?: boolean
  /** Options passed to `new maplibregl.Popup()`. */
  options?: MapLibre.PopupOptions
}>(), {
  open: false,
})

const emit = defineEmits<{
  open: [event: MapLibre.Event]
  close: [event: MapLibre.Event]
}>()

defineSlots<{
  default?: () => any
}>()

const markerContext = inject(MAPLIBRE_MARKER_INJECTION_KEY, undefined)
const content = useTemplateRef<HTMLElement>('content')
let boundMarker: MapLibre.Marker | undefined
let popupMap: MapLibre.Map | undefined
const openHandler = (event: MapLibre.Event) => emit('open', event)
const closeHandler = (event: MapLibre.Event) => emit('close', event)

function setOpen(instance: MapLibre.Popup, open: boolean): void {
  if (open === instance.isOpen())
    return
  if (open) {
    if (boundMarker)
      boundMarker.togglePopup()
    else if (popupMap)
      instance.addTo(popupMap)
  }
  else {
    instance.remove()
  }
}

const popup = useMapLibreResource<MapLibre.Popup>({
  ready: () => !!content.value && (!!markerContext?.marker.value || !!props.position),
  create({ maplibre, map }) {
    popupMap = map
    const instance = new maplibre.Popup(props.options).setDOMContent(content.value!)
    instance.on('open', openHandler)
    instance.on('close', closeHandler)

    boundMarker = markerContext?.marker.value
    if (boundMarker)
      boundMarker.setPopup(instance)
    else if (props.position)
      instance.setLngLat(props.position)

    setOpen(instance, props.open)
    return instance
  },
  cleanup(instance) {
    if (boundMarker) {
      boundMarker.setPopup(null)
      boundMarker = undefined
    }
    instance.off('open', openHandler)
    instance.off('close', closeHandler)
    instance.remove()
    popupMap = undefined
  },
})

watch(() => props.open, open => popup.value && setOpen(popup.value, open))

watch(() => props.position, (position) => {
  if (popup.value && position && !boundMarker)
    popup.value.setLngLat(position)
}, { deep: 1 })

watch(() => props.options, (options) => {
  if (!popup.value || !options)
    return
  Object.assign(popup.value.options, options)
  if (options.maxWidth)
    popup.value.setMaxWidth(options.maxWidth)
  if (options.offset)
    popup.value.setOffset(options.offset)
}, { deep: 2 })

defineExpose({ popup })
</script>

<template>
  <div class="maplibre-popup-content-source">
    <div ref="content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.maplibre-popup-content-source {
  display: none;
}
</style>
