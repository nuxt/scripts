<script setup lang="ts">
import { computed, inject, ref, useTemplateRef, watch } from 'vue'
import { MARKER_INJECTION_KEY } from './injectionKeys'
import { MARKER_CLUSTERER_INJECTION_KEY } from './ScriptGoogleMapsMarkerClusterer.vue'
import { useGoogleMapsResource } from './useGoogleMapsResource'

type OverlayAnchor = 'center' | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'left-center' | 'right-center'

type OverlayPane = 'mapPane' | 'overlayLayer' | 'markerLayer'
  | 'overlayMouseTarget' | 'floatPane'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  /**
   * Geographic position for the overlay. Falls back to parent marker position if omitted.
   * @see https://developers.google.com/maps/documentation/javascript/reference/overlay-view#OverlayView
   */
  position?: google.maps.LatLngLiteral
  /**
   * Anchor point of the overlay relative to its position.
   * @default 'bottom-center'
   */
  anchor?: OverlayAnchor
  /**
   * Pixel offset from the anchor position.
   */
  offset?: { x: number, y: number }
  /**
   * The map pane on which to render the overlay.
   * @default 'floatPane'
   * @see https://developers.google.com/maps/documentation/javascript/reference/overlay-view#MapPanes
   */
  pane?: OverlayPane
  /**
   * CSS z-index for the overlay element.
   */
  zIndex?: number
  /**
   * Whether to block map click and gesture events from passing through the overlay.
   * @default true
   */
  blockMapInteraction?: boolean
  /**
   * Pan the map so the overlay is fully visible when opened, similar to InfoWindow behavior.
   * Set to `true` for default 40px padding, or a number for custom padding.
   * @default true
   */
  panOnOpen?: boolean | number
  /**
   * Automatically hide the overlay when its parent marker joins a cluster (on zoom out).
   * Only applies when nested inside a ScriptGoogleMapsMarkerClusterer.
   * @default true
   */
  hideWhenClustered?: boolean
}>(), {
  anchor: 'bottom-center',
  pane: 'floatPane',
  blockMapInteraction: true,
  panOnOpen: true,
  hideWhenClustered: true,
})

const open = defineModel<boolean>('open', { default: undefined })

const markerContext = inject(MARKER_INJECTION_KEY, undefined)
const markerClustererContext = inject(MARKER_CLUSTERER_INJECTION_KEY, undefined)

// Read position fresh each call — NOT a computed, because Google Maps object
// internal state (marker.getPosition()) is invisible to Vue's reactivity.
// A computed would cache stale coordinates after marker drag.
function getResolvedPosition(): google.maps.LatLngLiteral | undefined {
  if (props.position)
    return props.position
  if (markerContext?.advancedMarkerElement.value) {
    const pos = markerContext.advancedMarkerElement.value.position
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

// Reactive open/closed state for CSS animations via data-state attribute.
// Tracks whether the overlay content is positioned and should be visually open.
const isPositioned = ref(false)
const dataState = computed(() => isPositioned.value ? 'open' : 'closed')

// Track all event listeners for clean teardown
const listeners: google.maps.MapsEventListener[] = []

function setDataState(el: HTMLElement, state: 'open' | 'closed') {
  el.dataset.state = state
  // Propagate to the slot's root element imperatively (Vue template bindings
  // don't reliably patch elements that have been moved to Google Maps panes)
  const child = el.firstElementChild as HTMLElement | null
  if (child)
    child.dataset.state = state
}

function hideElement(el: HTMLElement) {
  el.style.visibility = 'hidden'
  el.style.pointerEvents = 'none'
  setDataState(el, 'closed')
}

function panMapToFitOverlay(el: HTMLElement, map: google.maps.Map, padding: number) {
  const child = el.firstElementChild
  if (!child)
    return
  const overlayRect = child.getBoundingClientRect()
  const mapRect = map.getDiv().getBoundingClientRect()
  let panX = 0
  let panY = 0
  if (overlayRect.top - padding < mapRect.top)
    panY = overlayRect.top - mapRect.top - padding
  if (overlayRect.bottom + padding > mapRect.bottom)
    panY = overlayRect.bottom - mapRect.bottom + padding
  if (overlayRect.left - padding < mapRect.left)
    panX = overlayRect.left - mapRect.left - padding
  else if (overlayRect.right + padding > mapRect.right)
    panX = overlayRect.right - mapRect.right + padding
  if (panX !== 0 || panY !== 0)
    map.panBy(panX, panY)
}

const overlay = useGoogleMapsResource<google.maps.OverlayView>({
  // ready condition accesses .value on ShallowRefs — tracked by whenever() in useGoogleMapsResource
  ready: () => !!overlayContent.value
    && !!(props.position || markerContext?.advancedMarkerElement.value),
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
        if (props.panOnOpen) {
          // Wait for draw() to position the element, then pan
          const padding = typeof props.panOnOpen === 'number' ? props.panOnOpen : 40
          requestAnimationFrame(() => {
            panMapToFitOverlay(el, map, padding)
          })
        }
      }

      override draw() {
        // v-model:open support: hide when explicitly closed
        if (open.value === false) {
          isPositioned.value = false
          hideElement(el)
          return
        }

        const position = getResolvedPosition()
        if (!position) {
          isPositioned.value = false
          hideElement(el)
          return
        }
        const projection = this.getProjection()
        if (!projection) {
          isPositioned.value = false
          hideElement(el)
          return
        }
        const pos = projection.fromLatLngToDivPixel(
          new mapsApi.LatLng(position.lat, position.lng),
        )
        if (!pos) {
          isPositioned.value = false
          hideElement(el)
          return
        }

        el.style.position = 'absolute'
        el.style.left = `${pos.x + (props.offset?.x ?? 0)}px`
        el.style.top = `${pos.y + (props.offset?.y ?? 0)}px`
        el.style.transform = ANCHOR_TRANSFORMS[props.anchor]
        if (props.zIndex !== undefined)
          el.style.zIndex = String(props.zIndex)
        el.style.visibility = 'visible'
        el.style.pointerEvents = 'auto'
        setDataState(el, 'open')
        isPositioned.value = true
      }

      override onRemove() {
        el.parentNode?.removeChild(el)
      }
    }

    // Prevent flash: hide until first draw() positions content
    el.style.visibility = 'hidden'
    el.style.pointerEvents = 'none'

    const ov = new CustomOverlay()
    ov.setMap(map)

    // Follow parent marker position changes
    if (markerContext?.advancedMarkerElement.value) {
      const ame = markerContext.advancedMarkerElement.value
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
if (markerContext) {
  watch(
    () => {
      const pos = markerContext.advancedMarkerElement.value?.position
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

// Pane or blockMapInteraction change requires remount (setMap cycles onRemove + onAdd + draw)
watch([() => props.pane, () => props.blockMapInteraction], () => {
  if (overlay.value) {
    const map = overlay.value.getMap()
    overlay.value.setMap(null)
    if (map)
      overlay.value.setMap(map)
  }
})

// Auto-hide overlay when its parent marker joins a cluster
if (markerClustererContext && markerContext) {
  watch(
    () => markerClustererContext.clusteringVersion.value,
    () => {
      if (!props.hideWhenClustered || open.value === false)
        return
      const clusterer = markerClustererContext.markerClusterer.value as any
      if (!clusterer?.clusters)
        return
      const parentMarker = markerContext.advancedMarkerElement.value
      if (!parentMarker)
        return
      const isClustered = clusterer.clusters.some(
        (cluster: any) => cluster.count > 1 && cluster.markers?.includes(parentMarker),
      )
      if (isClustered)
        open.value = false
    },
  )
}

defineExpose({ overlay, dataState })
</script>

<template>
  <div style="display: none;">
    <div ref="overlay-content" :data-state="dataState" v-bind="$attrs">
      <slot />
    </div>
  </div>
</template>
