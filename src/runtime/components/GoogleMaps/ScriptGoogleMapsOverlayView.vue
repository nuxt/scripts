<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

type OverlayAnchor = 'center' | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'left-center' | 'right-center'

type OverlayPane = 'mapPane' | 'overlayLayer' | 'markerLayer'
  | 'overlayMouseTarget' | 'floatPane'

const props = withDefaults(defineProps<{
  position: google.maps.LatLngLiteral
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

const overlay = useGoogleMapsResource<google.maps.OverlayView>({
  ready: () => !!overlayContent.value,
  create({ mapsApi, map }) {
    const el = overlayContent.value!
    let hasDrawn = false

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
        const projection = this.getProjection()
        if (!projection)
          return
        const pos = projection.fromLatLngToDivPixel(
          new mapsApi.LatLng(props.position.lat, props.position.lng),
        )
        if (!pos)
          return
        el.style.position = 'absolute'
        el.style.left = `${pos.x + (props.offset?.x ?? 0)}px`
        el.style.top = `${pos.y + (props.offset?.y ?? 0)}px`
        el.style.transform = ANCHOR_TRANSFORMS[props.anchor]
        if (props.zIndex !== undefined)
          el.style.zIndex = String(props.zIndex)
        if (!hasDrawn) {
          el.style.visibility = 'visible'
          hasDrawn = true
        }
      }

      override onRemove() {
        el.parentNode?.removeChild(el)
      }
    }

    // Prevent flash: hide until first draw() positions content
    el.style.visibility = 'hidden'

    const ov = new CustomOverlay()
    ov.setMap(map)
    return ov
  },
  cleanup(ov) {
    ov.setMap(null)
  },
})

// Reposition on prop changes (draw() is designed to be called repeatedly)
watch(
  () => [props.position.lat, props.position.lng, props.offset?.x, props.offset?.y, props.zIndex, props.anchor],
  () => { overlay.value?.draw() },
)

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
