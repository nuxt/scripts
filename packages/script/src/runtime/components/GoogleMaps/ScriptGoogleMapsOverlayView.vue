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
import { computed, inject, shallowRef, useTemplateRef, watch } from 'vue'
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

const overlayAnchor = useTemplateRef('overlay-anchor')

// Reactive pixel position written by `draw()`. The template style binding
// on the anchor element reads it, so position updates flow through Vue's
// reactivity instead of imperative `el.style.left/top` writes.
const overlayPosition = shallowRef<{ x: number, y: number } | undefined>(undefined)

// `dataState` reflects the visible/hidden state of the overlay. It is bound
// directly on the content element so CSS animations targeting `[data-state]`
// react without any imperative DOM writes.
const dataState = computed<'open' | 'closed'>(() =>
  open.value !== false && overlayPosition.value !== undefined ? 'open' : 'closed',
)

// Computed style for the anchor element. Vue patches the moved DOM node via
// this binding even after Google Maps has reparented it into a pane.
const overlayStyle = computed<Record<string, string | undefined>>(() => {
  const visible = open.value !== false && overlayPosition.value !== undefined
  if (!visible) {
    return {
      position: 'absolute',
      visibility: 'hidden',
      pointerEvents: 'none',
    }
  }
  const { x, y } = overlayPosition.value!
  return {
    position: 'absolute',
    left: `${x + (offset?.x ?? 0)}px`,
    top: `${y + (offset?.y ?? 0)}px`,
    transform: ANCHOR_TRANSFORMS[anchor],
    zIndex: zIndex !== undefined ? String(zIndex) : undefined,
    visibility: 'visible',
    pointerEvents: 'auto',
  }
})

// Track all event listeners for clean teardown
const listeners: google.maps.MapsEventListener[] = []

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

// Factory that builds the OverlayView subclass. Lifted out of `create()`
// so the create callback stays focused on wiring (instantiation, listeners).
// The class still has to extend `mapsApi.OverlayView`, which is only
// available after the script loads, so this stays a function rather than
// a top-level class declaration.
function makeOverlayClass(mapsApi: typeof google.maps, map: google.maps.Map) {
  return class CustomOverlay extends mapsApi.OverlayView {
    override onAdd() {
      const panes = this.getPanes()
      const el = overlayAnchor.value
      if (panes && el) {
        panes[pane].appendChild(el)
        if (blockMapInteraction)
          mapsApi.OverlayView.preventMapHitsAndGesturesFrom(el)
      }
      if (panOnOpen) {
        // Wait for draw() to position the element, then pan
        const padding = typeof panOnOpen === 'number' ? panOnOpen : 40
        requestAnimationFrame(() => {
          if (overlayAnchor.value)
            panMapToFitOverlay(overlayAnchor.value, map, padding)
        })
      }
    }

    override draw() {
      if (open.value === false) {
        overlayPosition.value = undefined
        return
      }
      const resolvedPosition = getResolvedPosition()
      if (!resolvedPosition) {
        overlayPosition.value = undefined
        return
      }
      const projection = this.getProjection()
      if (!projection) {
        overlayPosition.value = undefined
        return
      }
      const pos = projection.fromLatLngToDivPixel(
        new mapsApi.LatLng(resolvedPosition.lat, resolvedPosition.lng),
      )
      if (!pos) {
        overlayPosition.value = undefined
        return
      }
      overlayPosition.value = { x: pos.x, y: pos.y }
    }

    override onRemove() {
      const el = overlayAnchor.value
      el?.parentNode?.removeChild(el)
    }
  }
}

const overlay = useGoogleMapsResource<google.maps.OverlayView>({
  // ready condition accesses .value on ShallowRefs — tracked by whenever() in useGoogleMapsResource
  ready: () => !!overlayAnchor.value
    && !!(position || markerContext?.advancedMarkerElement.value),
  create({ mapsApi, map }) {
    const CustomOverlay = makeOverlayClass(mapsApi, map)
    const ov = new CustomOverlay()
    ov.setMap(map)

    // Follow parent marker position changes. AdvancedMarkerElement fires
    // `drag` continuously during drag, so the overlay tracks live.
    if (markerContext?.advancedMarkerElement.value) {
      const ame = markerContext.advancedMarkerElement.value
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
    <!--
      Two-element structure:
        - `overlay-anchor` is moved into a Google Maps pane on `onAdd()`. Its
          inline style is reactively bound to `overlayStyle`, so position
          updates from `draw()` flow through Vue's patcher even after the node
          has been reparented out of the component tree.
        - `overlay-content` carries `data-state`, attribute-based animations,
          and forwards parent attrs (e.g. `class`) so consumers can target it
          directly with `[data-state]` selectors.
    -->
    <div ref="overlay-anchor" :style="overlayStyle">
      <div :data-state="dataState" v-bind="$attrs">
        <slot />
      </div>
    </div>
  </div>
</template>
