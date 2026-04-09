<script lang="ts">
import type { ShallowRef } from 'vue'

export type ScriptGoogleMapsOverlayAnchor = 'center' | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right'
  | 'left-center' | 'right-center'

export type ScriptGoogleMapsOverlayPane = 'mapPane' | 'overlayLayer' | 'markerLayer'
  | 'overlayMouseTarget' | 'floatPane'

export interface ScriptGoogleMapsOverlayViewProps {
  /**
   * Geographic position for the overlay. Falls back to parent marker position if omitted.
   *
   * Accepts either a plain `LatLngLiteral` (`{ lat, lng }`) or a
   * `google.maps.LatLng` instance.
   * @see https://developers.google.com/maps/documentation/javascript/reference/overlay-view#OverlayView
   */
  position?: google.maps.LatLng | google.maps.LatLngLiteral
  /**
   * Initial open state for the uncontrolled mode (when `v-model:open` is not
   * bound). When omitted, the overlay opens on mount, matching v0 behaviour.
   *
   * Has no effect when `v-model:open` is used; pass an initial value to the
   * bound ref instead.
   * @default true
   */
  defaultOpen?: boolean
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

export interface ScriptGoogleMapsOverlayViewSlots {
  default?: () => any
}

export interface ScriptGoogleMapsOverlayViewExpose {
  /** The underlying `OverlayView` instance. */
  overlayView: ShallowRef<google.maps.OverlayView | undefined>
  /**
   * The underlying `OverlayView` instance.
   *
   * @deprecated Use `overlayView` instead. The `overlay` alias will be
   * removed in a future major version.
   * @see https://scripts.nuxt.com/docs/migration-guide/v0-to-v1
   */
  overlay: ShallowRef<google.maps.OverlayView | undefined>
  /** The current data-state of the overlay, either 'open' or 'closed'. */
  dataState: Readonly<ShallowRef<'open' | 'closed'>>
}
</script>

<script setup lang="ts">
import { computed, inject, ref, useTemplateRef, watch } from 'vue'
import { MARKER_CLUSTERER_INJECTION_KEY } from './types'
import { defineDeprecatedAlias, MARKER_INJECTION_KEY, normalizeLatLng, useGoogleMapsResource } from './useGoogleMapsResource'

defineOptions({
  inheritAttrs: false,
})

const {
  position,
  defaultOpen = true,
  anchor = 'bottom-center',
  offset,
  pane = 'floatPane',
  zIndex,
  blockMapInteraction = true,
  panOnOpen = true,
  hideWhenClustered = true,
} = defineProps<ScriptGoogleMapsOverlayViewProps>()

defineSlots<ScriptGoogleMapsOverlayViewSlots>()

// Controlled vs uncontrolled open state.
//   - When the parent binds `v-model:open`, `open` becomes a controlled
//     model that writes through `emit('update:open', value)`.
//   - When the parent omits it, `open` is a local ref managed by the
//     component, seeded from `defaultOpen` (which defaults to `true`,
//     preserving v0 behaviour where the overlay opens on mount).
//
// `defineModel` is used here (rather than reactive prop destructure) because
// it accepts `default: undefined`, which opts out of Vue's boolean prop
// coercion that would otherwise turn an unset `open` into `false`. We then
// seed the local default below if the model is uncontrolled.
const open = defineModel<boolean>('open', { default: undefined })
if (open.value === undefined)
  open.value = defaultOpen ?? true

const markerContext = inject(MARKER_INJECTION_KEY, undefined)
const markerClustererContext = inject(MARKER_CLUSTERER_INJECTION_KEY, undefined)

// Read position fresh each call: NOT a computed, because Google Maps object
// internal state (marker.getPosition()) is invisible to Vue's reactivity. A
// computed would cache stale coordinates after marker drag.
//
// `position` may be either a `LatLngLiteral` or a `google.maps.LatLng` instance,
// so we normalize through `normalizeLatLng` (which checks for callable `.lat`
// rather than relying on `instanceof`, since mocked APIs in tests return plain
// objects).
function getResolvedPosition(): google.maps.LatLngLiteral | undefined {
  if (position)
    return normalizeLatLng(position)
  const markerPosition = markerContext?.advancedMarkerElement.value?.position
  if (markerPosition)
    return normalizeLatLng(markerPosition)
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
    && !!(position || markerContext?.advancedMarkerElement.value),
  create({ mapsApi, map }) {
    const el = overlayContent.value!

    class CustomOverlay extends mapsApi.OverlayView {
      override onAdd() {
        const panes = this.getPanes()
        if (panes) {
          panes[pane].appendChild(el)
          if (blockMapInteraction)
            mapsApi.OverlayView.preventMapHitsAndGesturesFrom(el)
        }
        if (panOnOpen) {
          // Wait for draw() to position the element, then pan
          const padding = typeof panOnOpen === 'number' ? panOnOpen : 40
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

        const resolvedPosition = getResolvedPosition()
        if (!resolvedPosition) {
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
          new mapsApi.LatLng(resolvedPosition.lat, resolvedPosition.lng),
        )
        if (!pos) {
          isPositioned.value = false
          hideElement(el)
          return
        }

        el.style.position = 'absolute'
        el.style.left = `${pos.x + (offset?.x ?? 0)}px`
        el.style.top = `${pos.y + (offset?.y ?? 0)}px`
        el.style.transform = ANCHOR_TRANSFORMS[anchor]
        if (zIndex !== undefined)
          el.style.zIndex = String(zIndex)
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
      const markerPosition = markerContext.advancedMarkerElement.value?.position
      return markerPosition ? normalizeLatLng(markerPosition) : undefined
    },
    () => { overlay.value?.draw() },
  )
}

// Reposition on prop changes (draw() is designed to be called repeatedly).
// Only watches explicit props; marker position changes are handled by the
// listeners above. `position` is normalized so that callable-coordinate
// LatLng instances produce a stable identity in the watch source.
watch(
  () => {
    const p = position ? normalizeLatLng(position) : undefined
    return [p?.lat, p?.lng, offset?.x, offset?.y, zIndex, anchor]
  },
  () => { overlay.value?.draw() },
)

// Toggle visibility without remounting the overlay when `open` changes.
watch(() => open.value, () => {
  if (!overlay.value)
    return
  overlay.value.draw()
})

// Pane or blockMapInteraction change requires remount (setMap cycles onRemove + onAdd + draw)
watch([() => pane, () => blockMapInteraction], () => {
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
      if (!hideWhenClustered || open.value === false)
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

const exposed: ScriptGoogleMapsOverlayViewExpose = {
  overlayView: overlay,
  // Plain alias for production. In dev, replaced below with a getter that
  // emits a one-shot deprecation warning. Both forms return the same
  // shallow ref as `overlayView`.
  overlay,
  dataState,
}

if (import.meta.dev) {
  defineDeprecatedAlias(
    exposed,
    'overlay',
    'overlayView',
    '[nuxt-scripts] <ScriptGoogleMapsOverlayView> expose key "overlay" is deprecated; use "overlayView" instead. See https://scripts.nuxt.com/docs/migration-guide/v0-to-v1',
  )
}

defineExpose<ScriptGoogleMapsOverlayViewExpose>(exposed)
</script>

<template>
  <div style="display: none;">
    <div ref="overlay-content" :data-state="dataState" v-bind="$attrs">
      <slot />
    </div>
  </div>
</template>
