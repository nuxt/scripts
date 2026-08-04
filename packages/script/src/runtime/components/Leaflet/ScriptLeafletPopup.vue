<script setup lang="ts">
import type * as Leaflet from 'leaflet'
import { inject, useTemplateRef, watch } from 'vue'
import { LEAFLET_MARKER_INJECTION_KEY, useLeafletResource } from './useLeafletResource'

const props = withDefaults(defineProps<{
  /** Position for a standalone popup. Omit when nested inside a marker. */
  position?: Leaflet.LatLngExpression
  /** Whether the popup is open. @default false */
  open?: boolean
  /** Options passed to `L.popup`. */
  options?: Leaflet.PopupOptions
}>(), {
  open: false,
})

const emit = defineEmits<{
  open: [event: Leaflet.LeafletEvent]
  close: [event: Leaflet.LeafletEvent]
}>()

defineSlots<{
  default?: () => any
}>()

const markerContext = inject(LEAFLET_MARKER_INJECTION_KEY, undefined)
const content = useTemplateRef<HTMLElement>('content')
let boundMarker: Leaflet.Marker | undefined
let popupMap: Leaflet.Map | undefined

const popup = useLeafletResource<Leaflet.Popup>({
  ready: () => !!content.value && (!!markerContext?.marker.value || !!props.position),
  create({ leaflet, map }) {
    popupMap = map
    const instance = leaflet.popup(props.options).setContent(content.value!)
    instance.on('add', event => emit('open', event))
    instance.on('remove', event => emit('close', event))

    boundMarker = markerContext?.marker.value
    if (boundMarker) {
      boundMarker.bindPopup(instance)
      if (props.open)
        boundMarker.openPopup()
    }
    else if (props.position) {
      instance.setLatLng(props.position)
      if (props.open)
        instance.openOn(map)
    }

    return instance
  },
  cleanup(instance) {
    if (boundMarker) {
      boundMarker.unbindPopup()
      boundMarker = undefined
    }
    instance.off()
    instance.remove()
    popupMap = undefined
  },
})

watch(() => props.open, (open) => {
  if (!popup.value)
    return
  if (boundMarker) {
    if (open)
      boundMarker.openPopup()
    else
      boundMarker.closePopup()
  }
  else if (open && popupMap) {
    popup.value.openOn(popupMap)
  }
  else {
    popup.value.close()
  }
})

watch(() => props.position, (position) => {
  if (popup.value && position && !boundMarker)
    popup.value.setLatLng(position)
}, { deep: 1 })

watch(() => props.options, (options) => {
  if (!popup.value || !options)
    return
  Object.assign(popup.value.options, options)
  popup.value.update()
}, { deep: 2 })

defineExpose({ popup })
</script>

<template>
  <div class="leaflet-popup-content-source">
    <div ref="content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.leaflet-popup-content-source {
  display: none;
}
</style>
