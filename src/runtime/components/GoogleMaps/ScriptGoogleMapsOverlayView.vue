<script setup lang="ts">
import { inject, useTemplateRef, watch } from 'vue'
import { ADVANCED_MARKER_ELEMENT_INJECTION_KEY, MARKER_INJECTION_KEY } from './injectionKeys'
import { useGoogleMapsResource } from './useGoogleMapsResource'

type OverlayAnchor = 'center' | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'left-center' | 'right-center'

type OverlayPane = 'mapPane' | 'overlayLayer' | 'markerLayer'
  | 'overlayMouseTarget' | 'floatPane'

const props = withDefaults(defineProps<{
  position?: google.maps.LatLngLiteral
  anchor?: OverlayAnchor
  offset?: { x: number, y: number }
  pane?: OverlayPane
  zIndex?: number
  blockMapInteraction?: boolean
}>(), {
  anchor: 'bottom-center',
  pane: 'floatPane',
  blockMapInteraction: true,
})

const open = defineModel<boolean>('open', { default: undefined })

const markerContext = inject(MARKER_INJECTION_KEY, undefined)
const advancedMarkerElementContext = inject(ADVANCED_MARKER_ELEMENT_INJECTION_KEY, undefined)

// Read position fresh each call — NOT a computed, because Google Maps object
// internal state (marker.getPosition()) is invisible to Vue's reactivity.
// A computed would cache stale coordinates after marker drag.
function getResolvedPosition(): google.maps.LatLngLiteral | undefined {
  if (props.position)
    return props.position
  if (markerContext?.marker.value) {
    const pos = markerContext.marker.value.getPosition()
    if (pos)
      return { lat: pos.lat(), lng: pos.lng() }
  }
  if (advancedMarkerElementContext?.advancedMarkerElement.value) {
    const pos = advancedMarkerElementContext.advancedMarkerElement.value.position
    if (pos) {
      // position can be LatLng or LatLngLiteral
      if ('lat' in pos && typeof pos.lat === 'function')
        return { lat: (pos as google.maps.LatLng).lat(), lng: (pos as google.maps.LatLng).lng() }
      return pos as google.maps.LatLngLiteral
    }
  }
  return undefined
}

const ANCHOR_TRANSFORMS: Record<OverlayAnchor, string> = {
  'center': 'translate(-50%, -50%)',
  'top-left': 'translate(0, 0)',
  'top-center': 'translate(-50%, 0)',
  'top-right': 'translate(-100%, 0)',
  'bottom-left': 'translate(0, -100%)',
  'bottom-center': 'translate(-50%, -100%)',
  'bottom-right': 'translate(-100%, -100%)',
  'left-center': 'translate(0, -50%)',
  'right-center': 'translate(-100%, -50%)',
}

const overlayContent = useTemplateRef('overlay-content')

// Track all event listeners for clean teardown
const listeners: google.maps.MapsEventListener[] = []

const overlay = useGoogleMapsResource<google.maps.OverlayView>({
  // ready condition accesses .value on ShallowRefs — tracked by whenever() in useGoogleMapsResource
  ready: () => !!overlayContent.value
    && !!(props.position || markerContext?.marker.value || advancedMarkerElementContext?.advancedMarkerElement.value),
  create({ mapsApi, map }) {
    const el = overlayContent.value!

    class CustomOverlay extends mapsApi.OverlayView {
      override onAdd() {
        const panes = this.getPanes()
        if (panes) {
          panes[props.pane].appendChild(el)
          if (props.blockMapInteraction)
            mapsApi.OverlayView.preventMapHitsAndGesturesFrom(el)
        }
      }

      override draw() {
        // v-model:open support: hide when explicitly closed
        if (open.value === false) {
          el.style.visibility = 'hidden'
          return
        }

        const position = getResolvedPosition()
        if (!position) {
          el.style.visibility = 'hidden'
          return
        }
        const projection = this.getProjection()
        if (!projection) {
          el.style.visibility = 'hidden'
          return
        }
        const pos = projection.fromLatLngToDivPixel(
          new mapsApi.LatLng(position.lat, position.lng),
        )
        if (!pos) {
          el.style.visibility = 'hidden'
          return
        }
        el.style.position = 'absolute'
        el.style.left = `${pos.x + (props.offset?.x ?? 0)}px`
        el.style.top = `${pos.y + (props.offset?.y ?? 0)}px`
        el.style.transform = ANCHOR_TRANSFORMS[props.anchor]
        if (props.zIndex !== undefined)
          el.style.zIndex = String(props.zIndex)
        el.style.visibility = 'visible'
      }

      override onRemove() {
        el.parentNode?.removeChild(el)
      }
    }

    // Prevent flash: hide until first draw() positions content
    el.style.visibility = 'hidden'

    const ov = new CustomOverlay()
    ov.setMap(map)

    // Follow parent marker position changes
    if (markerContext?.marker.value) {
      // Legacy Marker fires position_changed on drag and programmatic moves
      listeners.push(
        markerContext.marker.value.addListener('position_changed', () => ov.draw()),
      )
    }
    else if (advancedMarkerElementContext?.advancedMarkerElement.value) {
      const ame = advancedMarkerElementContext.advancedMarkerElement.value
      // AdvancedMarkerElement fires drag continuously during drag
      listeners.push(
        ame.addListener('drag', () => ov.draw()),
        ame.addListener('dragend', () => ov.draw()),
      )
    }

    return ov
  },
  cleanup(ov) {
    listeners.forEach(l => l.remove())
    listeners.length = 0
    ov.setMap(null)
  },
})

// AdvancedMarkerElement doesn't fire position_changed, so watch the reactive ref
// for programmatic position updates (drag is handled by event listeners above)
if (advancedMarkerElementContext) {
  watch(
    () => {
      const pos = advancedMarkerElementContext.advancedMarkerElement.value?.position
      if (!pos)
        return undefined
      if ('lat' in pos && typeof pos.lat === 'function')
        return { lat: (pos as google.maps.LatLng).lat(), lng: (pos as google.maps.LatLng).lng() }
      return pos as google.maps.LatLngLiteral
    },
    () => { overlay.value?.draw() },
  )
}

// Reposition on prop changes (draw() is designed to be called repeatedly)
// Only watches explicit props — marker position changes are handled by event listeners above
watch(
  () => [props.position?.lat, props.position?.lng, props.offset?.x, props.offset?.y, props.zIndex, props.anchor],
  () => { overlay.value?.draw() },
)

// v-model:open — toggle visibility without remounting the overlay
watch(() => open.value, () => {
  if (!overlay.value)
    return
  overlay.value.draw()
})

// Pane change requires remount (setMap cycles onRemove + onAdd + draw)
watch(() => props.pane, () => {
  if (overlay.value) {
    const map = overlay.value.getMap()
    overlay.value.setMap(null)
    if (map)
      overlay.value.setMap(map as google.maps.Map)
  }
})

// blockMapInteraction change requires remount to re-apply preventMapHitsAndGesturesFrom
watch(() => props.blockMapInteraction, () => {
  if (overlay.value) {
    const map = overlay.value.getMap()
    overlay.value.setMap(null)
    if (map)
      overlay.value.setMap(map as google.maps.Map)
  }
})

defineExpose({ overlay })
</script>

<template>
  <div style="display: none;">
    <div ref="overlay-content">
      <slot />
    </div>
  </div>
</template>
