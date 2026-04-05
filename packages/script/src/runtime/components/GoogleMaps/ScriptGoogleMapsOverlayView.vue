<script setup lang="ts">
import type { ShallowRef, WatchHandle } from 'vue'
import { useVModel, whenever } from '@vueuse/core'
import { computed, inject, shallowRef, useTemplateRef, watch } from 'vue'
import { MARKER_CLUSTERER_INJECTION_KEY } from './types'
import { MARKER_INJECTION_KEY, useGoogleMapsResource } from './useGoogleMapsResource'

export type ScriptGoogleMapsOverlayAnchor = 'center' | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'left-center' | 'right-center'

export type ScriptGoogleMapsOverlayPane = 'mapPane' | 'overlayLayer' | 'markerLayer'
  | 'overlayMouseTarget' | 'floatPane'

export interface ScriptGoogleMapsOverlayViewProps {
  /**
     * The open state of the overlay view when it is initially rendered.
     * Use when you do not need to control its open state.
     */
  defaultOpen?: boolean
  /**
     * The controlled open state of the overlay view. Can be binded with `v-model`.
     */
  open?: boolean
  /**
     * Geographic position for the overlay. Falls back to parent marker position if omitted.
     * @see https://developers.google.com/maps/documentation/javascript/reference/overlay-view#OverlayView
     */
  position?: google.maps.LatLng | google.maps.LatLngLiteral
  /**
     * Anchor point of the overlay relative to its position.
     * @default 'bottom-center'
     */
  anchor?: ScriptGoogleMapsOverlayAnchor
  /**
     * Pixel offset from the anchor position.
     */
  offset?: { x: number, y: number }
  /**
     * The map pane on which to render the overlay.
     * @default 'floatPane'
     * @see https://developers.google.com/maps/documentation/javascript/reference/overlay-view#MapPanes
     */
  pane?: ScriptGoogleMapsOverlayPane
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
}

export interface ScriptGoogleMapsOverlayViewEmits {
  /** Event handler called when the open state of the overlay view changes. */
  'update:open': [value: boolean]
}

export interface ScriptGoogleMapsOverlayViewExpose {
  /** The underlying `OverlayView` instance extending `google.maps.OverlayView`. */
  overlayView: ShallowRef<OverlayView | undefined>
  /** The current data-state of the overlay, either 'open' or 'closed'. */
  dataState: ShallowRef<'open' | 'closed'>
}

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<ScriptGoogleMapsOverlayViewProps>(), {
  open: undefined,
  defaultOpen: true,
  anchor: 'bottom-center',
  pane: 'floatPane',
  blockMapInteraction: true,
  panOnOpen: true,
  hideWhenClustered: true,
})

const emit = defineEmits<ScriptGoogleMapsOverlayViewEmits>()

defineSlots<{
  default?: () => any
}>()

const open = useVModel(props, 'open', emit, {
  defaultValue: props.defaultOpen,
  passive: (props.open === undefined) as false,
}) as ShallowRef<boolean>

const markerContext = inject(MARKER_INJECTION_KEY, undefined)
const markerClustererContext = inject(MARKER_CLUSTERER_INJECTION_KEY, undefined)

// Read position fresh each call — NOT a computed, because Google Maps object
// internal state (marker.getPosition()) is invisible to Vue's reactivity.
// A computed would cache stale coordinates after marker drag.
function getResolvedPosition(): google.maps.LatLng | google.maps.LatLngLiteral | undefined {
  if (props.position) {
    return props.position
  }

  if (markerContext?.advancedMarkerElement.value) {
    const markerPosition = markerContext.advancedMarkerElement.value.position

    if (markerPosition) {
      return markerPosition instanceof google.maps.LatLng
        ? {
            lat: markerPosition.lat(),
            lng: markerPosition.lng(),
          }
        : {
            lat: markerPosition.lat,
            lng: markerPosition.lng,
          }
    }
  }

  return undefined
}

const ANCHOR_TRANSFORMS: Record<ScriptGoogleMapsOverlayAnchor, string> = {
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

const overlayAnchor = useTemplateRef('overlay-anchor')

const overlayContent = useTemplateRef('overlay-content')

const dataState = computed(() => open.value ? 'open' : 'closed')

const listeners: google.maps.MapsEventListener[] = []

const overlayPosition = shallowRef<google.maps.Point>()

class OverlayView extends google.maps.OverlayView {
  private anchorEl: HTMLElement
  private contentEl: HTMLElement
  private mapsApi: typeof google.maps
  private map: google.maps.Map
  private panOnOpenWatchHandle: WatchHandle | undefined

  constructor(anchorEl: HTMLElement, contentEl: HTMLElement, mapsApi: typeof google.maps, map: google.maps.Map) {
    super()

    this.anchorEl = anchorEl
    this.contentEl = contentEl
    this.mapsApi = mapsApi
    this.map = map
  }

  override onAdd() {
    const panes = this.getPanes()

    if (panes) {
      panes[props.pane].appendChild(this.anchorEl)
    }

    if (props.blockMapInteraction) {
      this.mapsApi.OverlayView.preventMapHitsAndGesturesFrom(this.anchorEl)
    }

    if (props.panOnOpen) {
      if (props.open) {
        this.panOnOpenWatchHandle = whenever(() => props.open, () => {
          requestAnimationFrame(() => this.panMapToFitOverlay())
        }, {
          immediate: true,
        })
      }
      else {
        requestAnimationFrame(() => this.panMapToFitOverlay())
      }
    }
  }

  override draw() {
    const position = getResolvedPosition()

    if (!position) {
      return
    }

    const projection = this.getProjection()

    const point = projection.fromLatLngToDivPixel(position)

    if (!point) {
      return
    }

    overlayPosition.value = new this.mapsApi.Point(
      point.x + (props.offset?.x ?? 0),
      point.y + (props.offset?.y ?? 0),
    )
  }

  override onRemove() {
    this.anchorEl.parentNode?.removeChild(this.anchorEl)

    this.panOnOpenWatchHandle?.()
  }

  panMapToFitOverlay() {
    const padding = typeof props.panOnOpen === 'number' ? props.panOnOpen : 40
    const overlayContentRect = this.contentEl.getBoundingClientRect()
    const mapRect = this.map.getDiv().getBoundingClientRect()

    let panX = 0
    let panY = 0

    if (overlayContentRect.top - padding < mapRect.top) {
      panY = overlayContentRect.top - mapRect.top - padding
    }
    else if (overlayContentRect.bottom + padding > mapRect.bottom) {
      panY = overlayContentRect.bottom - mapRect.bottom + padding
    }

    if (overlayContentRect.left - padding < mapRect.left) {
      panX = overlayContentRect.left - mapRect.left - padding
    }
    else if (overlayContentRect.right + padding > mapRect.right) {
      panX = overlayContentRect.right - mapRect.right + padding
    }

    if (panX !== 0 || panY !== 0) {
      this.map.panBy(panX, panY)
    }
  }
}

const overlayView = useGoogleMapsResource<OverlayView>({
  // ready condition accesses .value on ShallowRefs — tracked by whenever() in useGoogleMapsResource
  ready: () => open.value && !!overlayAnchor.value && !!overlayContent.value
    && !!(props.position || markerContext?.advancedMarkerElement.value),
  create({ mapsApi, map }) {
    const anchorEl = overlayAnchor.value!
    const contentEl = overlayContent.value!

    const overlayView = new OverlayView(anchorEl, contentEl, mapsApi, map)

    overlayView.setMap(map)

    // Follow parent marker position changes
    if (markerContext?.advancedMarkerElement.value) {
      const ame = markerContext.advancedMarkerElement.value

      // AdvancedMarkerElement fires drag continuously during drag
      listeners.push(
        ame.addListener('drag', () => overlayView.draw()),
        ame.addListener('dragend', () => overlayView.draw()),
      )
    }

    return overlayView
  },
  cleanup(overlayView) {
    listeners.forEach(l => l.remove())
    listeners.length = 0

    overlayView.setMap(null)
  },
})

// AdvancedMarkerElement doesn't fire position_changed, so watch the reactive ref
// for programmatic position updates (drag is handled by event listeners above)
if (markerContext) {
  watch(
    () => {
      const markerPosition = markerContext.advancedMarkerElement.value?.position

      if (!markerPosition) {
        return undefined
      }

      return markerPosition instanceof google.maps.LatLng
        ? { lat: markerPosition.lat(), lng: markerPosition.lng() }
        : { lat: markerPosition.lat, lng: markerPosition.lng }
    },
    () => { overlayView.value?.draw() },
  )
}

// Reposition on prop changes (draw() is designed to be called repeatedly)
// Only watches explicit props — marker position changes are handled by event listeners above
watch(
  [
    () => props.position,
    () => props.offset?.x,
    () => props.offset?.y,
    () => props.zIndex,
    () => props.anchor,
  ],
  () => { overlayView.value?.draw() },
)

// Pane or blockMapInteraction change requires remount (setMap cycles onRemove + onAdd + draw)
watch([() => props.pane, () => props.blockMapInteraction], () => {
  if (overlayView.value) {
    const map = overlayView.value.getMap()
    overlayView.value.setMap(null)
    if (map)
      overlayView.value.setMap(map)
  }
})

// Auto-hide overlay when its parent marker joins a cluster
if (markerClustererContext && markerContext) {
  watch(
    markerClustererContext.clusteringVersion,
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

defineExpose<ScriptGoogleMapsOverlayViewExpose>({ overlayView, dataState })
</script>

<template>
  <div style="display: none;">
    <div
      ref="overlay-anchor" :style="{
        position: 'absolute',
        left: `${overlayPosition?.x ?? 0}px`,
        top: `${overlayPosition?.y ?? 0}px`,
        transform: ANCHOR_TRANSFORMS[anchor],
        zIndex,
        willChange: 'transform',
        visibility: open ? 'visible' : 'hidden',
        pointerEvents: open ? 'auto' : 'none',
      }"
    >
      <div ref="overlay-content" :data-state="dataState" v-bind="$attrs">
        <slot />
      </div>
    </div>
  </div>
</template>
