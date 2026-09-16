<script lang="ts">
export type {
  ScriptMapLibreMapEmits,
  ScriptMapLibreMapExpose,
  ScriptMapLibreMapProps,
  ScriptMapLibreMapSlots,
} from './types'

export { MAPLIBRE_MAP_INJECTION_KEY } from './useMapLibreResource'
</script>

<script setup lang="ts">
import type * as MapLibre from 'maplibre-gl'
import type { CSSProperties, HTMLAttributes, ShallowRef as VueShallowRef } from 'vue'
import type { ScriptMapLibreMapEmits, ScriptMapLibreMapExpose, ScriptMapLibreMapProps, ScriptMapLibreMapSlots } from './types'
import type { MapLibreMapContext } from './useMapLibreResource'
import { computed, onBeforeUnmount, onMounted, onUnmounted, provide, shallowRef, toRaw, useId, useTemplateRef, watch } from 'vue'
import { useScriptTriggerElement } from '#nuxt-scripts/composables/useScriptTriggerElement'
import { useScriptMapLibre } from '#nuxt-scripts/registry/maplibre'
import ScriptAriaLoadingIndicator from '../ScriptAriaLoadingIndicator.vue'
import { MAPLIBRE_MAP_INJECTION_KEY } from './useMapLibreResource'

const props = withDefaults(defineProps<ScriptMapLibreMapProps>(), {
  trigger: 'visible',
  zoom: 12,
  bearing: 0,
  pitch: 0,
  injectStyles: true,
  width: 640,
  height: 400,
  ariaLabel: 'Interactive map',
  interactive: true,
})
const emit = defineEmits<ScriptMapLibreMapEmits>()
const slots = defineSlots<ScriptMapLibreMapSlots>()

const rootEl = useTemplateRef<HTMLElement>('rootEl')
const mapEl = useTemplateRef<HTMLElement>('mapEl')
const descriptionId = `maplibre-description-${useId()}`
const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })
const { load, status, onLoaded, onError } = useScriptMapLibre({
  injectStyles: props.injectStyles,
  stylesheetUrl: props.stylesheetUrl,
  workerUrl: props.workerUrl,
  scriptOptions: { trigger },
})

const maplibre = shallowRef() as VueShallowRef<typeof MapLibre | undefined>
const map = shallowRef<MapLibre.Map>()
const isMapReady = shallowRef(false)
const loadError = shallowRef(new Error('MapLibre failed to load'))
const initializationError = shallowRef<Error>()
const hasError = computed(() => status.value === 'error' || !!initializationError.value)
let isUnmounted = false

onError((error?: Error) => {
  loadError.value = error ?? new Error('MapLibre failed to load')
  emit('error', loadError.value)
})

/** Moves the camera so the bounds fit the viewport. */
function fitBounds(bounds: MapLibre.LngLatBoundsLike, options?: MapLibre.FitBoundsOptions): void {
  map.value?.fitBounds(bounds, options)
}

/** Animates the camera along a straight path. */
function easeTo(options: MapLibre.EaseToOptions): void {
  map.value?.easeTo(options)
}

/** Animates the camera along a curved flight path. */
function flyTo(options: MapLibre.FlyToOptions): void {
  map.value?.flyTo(options)
}

/**
 * Options for a fit to the `bounds` prop. A fit resets the bearing to 0 by
 * default, so it keeps the `bearing` prop unless the options set one.
 */
function boundsFitOptions(): MapLibre.FitBoundsOptions {
  return { bearing: props.bearing, ...toRaw(props.fitBoundsOptions) }
}

/** Coordinates of the bounds the camera last fitted, as `[[west, south], [east, north]]`. */
let fittedBounds: string | undefined

function boundsKey(bounds: MapLibre.LngLatBoundsLike, library: typeof MapLibre): string {
  return JSON.stringify(library.LngLatBounds.convert(toRaw(bounds)).toArray())
}

const exposed: ScriptMapLibreMapExpose = { maplibre, map, load, fitBounds, easeTo, flyTo }
defineExpose<ScriptMapLibreMapExpose>(exposed)
provide(MAPLIBRE_MAP_INJECTION_KEY, {
  maplibre: maplibre as unknown as MapLibreMapContext['maplibre'],
  map,
})

function bindMapEvents(instance: MapLibre.Map): void {
  instance.on('load', event => emit('load', event))
  // MapLibre drops every source and layer on `setStyle`. Anything added on the
  // raw map must be added again when this fires.
  instance.on('style.load', event => emit('styleload', event))
  instance.on('click', event => emit('click', event))
  instance.on('move', event => emit('move', event))
  instance.on('moveend', (event) => {
    emit('moveend', event)
    emit('update:center', instance.getCenter())
  })
  instance.on('zoom', event => emit('zoom', event))
  instance.on('zoomend', (event) => {
    emit('zoomend', event)
    emit('update:zoom', instance.getZoom())
  })
  instance.on('rotate', event => emit('rotate', event))
  instance.on('rotateend', (event) => {
    emit('rotateend', event)
    emit('update:bearing', instance.getBearing())
  })
  instance.on('pitch', event => emit('pitch', event))
  instance.on('pitchend', (event) => {
    emit('pitchend', event)
    emit('update:pitch', instance.getPitch())
  })
  instance.on('error', (event) => {
    const error = event.error instanceof Error ? event.error : new Error(event.error.message, { cause: event.error })
    loadError.value = error
    emit('error', error)
  })
}

/**
 * MapLibre makes its canvas a focusable `region` named "Map". This component's
 * container is already the labelled region, so the canvas drops its nested
 * landmark. The keyboard handler only works while the canvas has focus, so the
 * canvas stays a tab stop only while that handler is enabled.
 */
function configureCanvasAccessibility(instance: MapLibre.Map): void {
  const canvas = instance.getCanvas()
  canvas.removeAttribute('role')
  if (props.interactive && instance.keyboard.isEnabled())
    return
  canvas.setAttribute('tabindex', '-1')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.removeAttribute('aria-label')
}

onMounted(() => {
  onLoaded((instance: { maplibregl: typeof MapLibre }) => {
    if (isUnmounted || !mapEl.value)
      return

    maplibre.value = instance.maplibregl
    let mapInstance: MapLibre.Map | undefined
    try {
      // MapLibre jumps to `center` and `zoom` first, then fits `bounds`, so
      // `bounds` wins for the initial center and zoom.
      mapInstance = new instance.maplibregl.Map({
        ...toRaw(props.options),
        container: mapEl.value,
        style: toRaw(props.mapStyle),
        center: toRaw(props.center),
        zoom: props.zoom,
        bearing: props.bearing,
        pitch: props.pitch,
        interactive: props.interactive,
        ...(props.bounds ? { bounds: toRaw(props.bounds), fitBoundsOptions: boundsFitOptions() } : {}),
      })
      fittedBounds = props.bounds ? boundsKey(props.bounds, instance.maplibregl) : undefined
      configureCanvasAccessibility(mapInstance)
      bindMapEvents(mapInstance)
      map.value = mapInstance
      mapInstance.once('load', () => {
        if (isUnmounted)
          return
        isMapReady.value = true
        mapInstance!.resize()
        emit('ready', exposed)
      })
    }
    catch (error) {
      mapInstance?.remove()
      const cause = error instanceof Error ? error : new Error('MapLibre map initialization failed')
      initializationError.value = cause
      loadError.value = cause
      emit('error', cause)
    }
  })
})

watch(() => props.mapStyle, (mapStyle) => {
  map.value?.setStyle(toRaw(mapStyle))
}, { deep: 2 })

watch(() => props.center, (center) => {
  if (!map.value || !maplibre.value || !center)
    return
  const current = map.value.getCenter()
  const next = maplibre.value.LngLat.convert(toRaw(center))
  if (current.lng !== next.lng || current.lat !== next.lat)
    map.value.jumpTo({ center: next })
}, { deep: 1 })

// A fit runs only when the coordinates change. A new array with the same
// coordinates, such as an inline literal on a parent render, keeps the camera
// where the user moved it. A change to `fitBoundsOptions` alone does not fit.
watch(() => props.bounds, (bounds) => {
  // Removing bounds keeps the camera. Forget the last fit, so bounds that come
  // back with the same coordinates fit again.
  if (!bounds) {
    fittedBounds = undefined
    return
  }
  if (!map.value || !maplibre.value)
    return
  const key = boundsKey(bounds, maplibre.value)
  if (key === fittedBounds)
    return
  fittedBounds = key
  // Camera props jump without animation, so a bounds change fits the same way.
  map.value.fitBounds(toRaw(bounds), { ...boundsFitOptions(), duration: 0 })
}, { deep: 2 })

watch(() => props.zoom, (zoom) => {
  if (map.value && map.value.getZoom() !== zoom)
    map.value.jumpTo({ zoom })
})

watch(() => props.bearing, (bearing) => {
  if (map.value && map.value.getBearing() !== bearing)
    map.value.jumpTo({ bearing })
})

watch(() => props.pitch, (pitch) => {
  if (map.value && map.value.getPitch() !== pitch)
    map.value.jumpTo({ pitch })
})

const DIGITS_ONLY_RE = /^\d+$/
const DIGITS_PX_RE = /^\d+px$/i

function toCssUnit(value: string | number | undefined): string | undefined {
  return typeof value === 'number' ? `${value}px` : value
}

function isPixelValue(value: string | number | undefined): boolean {
  return typeof value === 'number'
    || (typeof value === 'string' && (DIGITS_ONLY_RE.test(value) || DIGITS_PX_RE.test(value)))
}

function pixelValue(value: string | number | undefined): number | undefined {
  return isPixelValue(value) ? Number.parseFloat(String(value)) : undefined
}

const rootAttrs = computed(() => ({
  ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  ...props.rootAttrs,
  'aria-busy': status.value === 'loading' ? true : undefined,
  'style': [
    {
      position: 'relative' as CSSProperties['position'],
      maxWidth: '100%',
      width: toCssUnit(props.width),
      height: isPixelValue(props.width) && isPixelValue(props.height) ? 'auto' : toCssUnit(props.height),
      aspectRatio: isPixelValue(props.width) && isPixelValue(props.height) ? `${pixelValue(props.width)} / ${pixelValue(props.height)}` : undefined,
    },
    props.rootAttrs?.style,
  ] as HTMLAttributes['style'],
}))

onBeforeUnmount(() => {
  isUnmounted = true
})

onUnmounted(() => {
  map.value?.remove()
  map.value = undefined
})
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    <div
      ref="mapEl"
      :aria-describedby="interactive && slots.description ? descriptionId : undefined"
      :aria-hidden="interactive ? undefined : 'true'"
      :aria-label="interactive ? ariaLabel : undefined"
      :inert="interactive ? undefined : true"
      :role="interactive ? 'region' : undefined"
      :style="{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        visibility: isMapReady ? 'visible' : 'hidden',
      }"
    />
    <div v-if="interactive && slots.description" :id="descriptionId" class="maplibre-map-description">
      <slot name="description" />
    </div>
    <slot v-if="!isMapReady && !hasError" name="placeholder" />
    <slot v-if="hasError" name="error" :error="loadError">
      <p role="alert">
        The map could not be loaded.
      </p>
    </slot>
    <slot v-else-if="status === 'loading'" name="loading">
      <ScriptAriaLoadingIndicator />
    </slot>
    <slot v-else-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot />
  </div>
</template>

<style scoped>
.maplibre-map-description {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
