<script lang="ts">
import type * as MapLibre from 'maplibre-gl'
import type { CSSProperties, HTMLAttributes, ReservedProps, ShallowRef, ShallowRef as VueShallowRef } from 'vue'
import type { ElementScriptTrigger } from '#nuxt-scripts/types'

export { MAPLIBRE_MAP_INJECTION_KEY } from './useMapLibreResource'

export interface ScriptMapLibreMapProps {
  /**
   * Defines when the MapLibre script loads.
   * @default 'visible'
   */
  trigger?: ElementScriptTrigger
  /** MapLibre style URL or inline style specification. */
  mapStyle: string | MapLibre.StyleSpecification
  /** Initial and reactively controlled map center. */
  center: MapLibre.LngLatLike
  /** Initial and reactively controlled zoom level. @default 12 */
  zoom?: number
  /** Initial and reactively controlled bearing in degrees. @default 0 */
  bearing?: number
  /** Initial and reactively controlled pitch in degrees. @default 0 */
  pitch?: number
  /** Options passed to `new maplibregl.Map()`. Dedicated props take precedence. */
  options?: Omit<MapLibre.MapOptions, 'container'>
  /** Inject MapLibre's stylesheet when the script begins loading. @default true */
  injectStyles?: boolean
  /** Custom MapLibre stylesheet URL. */
  stylesheetUrl?: string
  /** Worker URL used with MapLibre's CSP-compatible build. */
  workerUrl?: string
  /** Width reserved before the map loads. @default 640 */
  width?: number | string
  /** Height reserved before the map loads. @default 400 */
  height?: number | string
  /** Accessible name for an interactive map. @default 'Interactive map' */
  ariaLabel?: string
  /** Disable map input and remove it from the accessibility tree when decorative. @default true */
  interactive?: boolean
  /** Attributes applied to the outer layout container. */
  rootAttrs?: HTMLAttributes & ReservedProps & Record<string, unknown>
}

export interface ScriptMapLibreMapExpose {
  maplibre: ShallowRef<typeof MapLibre | undefined>
  map: ShallowRef<MapLibre.Map | undefined>
  load: () => Promise<unknown> | unknown
}

export interface ScriptMapLibreMapEmits {
  'ready': [payload: ScriptMapLibreMapExpose]
  'error': [error: Error]
  'click': [event: MapLibre.MapEventType['click']]
  'move': [event: MapLibre.MapEventType['move']]
  'moveend': [event: MapLibre.MapEventType['moveend']]
  'zoom': [event: MapLibre.MapEventType['zoom']]
  'zoomend': [event: MapLibre.MapEventType['zoomend']]
  'rotate': [event: MapLibre.MapEventType['rotate']]
  'rotateend': [event: MapLibre.MapEventType['rotateend']]
  'pitch': [event: MapLibre.MapEventType['pitch']]
  'pitchend': [event: MapLibre.MapEventType['pitchend']]
  'update:center': [center: MapLibre.LngLat]
  'update:zoom': [zoom: number]
  'update:bearing': [bearing: number]
  'update:pitch': [pitch: number]
}

export interface ScriptMapLibreMapSlots {
  default?: () => any
  loading?: () => any
  awaitingLoad?: () => any
  error?: (props: { error: Error }) => any
  placeholder?: () => any
  /** Text or links that expose the canvas map's essential information to assistive technology. */
  description?: () => any
}
</script>

<script setup lang="ts">
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

const exposed: ScriptMapLibreMapExpose = { maplibre, map, load }
defineExpose<ScriptMapLibreMapExpose>(exposed)
provide(MAPLIBRE_MAP_INJECTION_KEY, {
  maplibre: maplibre as unknown as MapLibreMapContext['maplibre'],
  map,
})

function bindMapEvents(instance: MapLibre.Map): void {
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
    loadError.value = event.error
    emit('error', event.error)
  })
}

onMounted(() => {
  onLoaded((instance: { maplibregl: typeof MapLibre }) => {
    if (isUnmounted || !mapEl.value)
      return

    maplibre.value = instance.maplibregl
    let mapInstance: MapLibre.Map | undefined
    try {
      mapInstance = new instance.maplibregl.Map({
        ...toRaw(props.options),
        container: mapEl.value,
        style: toRaw(props.mapStyle),
        center: toRaw(props.center),
        zoom: props.zoom,
        bearing: props.bearing,
        pitch: props.pitch,
        interactive: props.interactive,
      })
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
  if (!map.value || !maplibre.value)
    return
  const current = map.value.getCenter()
  const next = maplibre.value.LngLat.convert(toRaw(center))
  if (current.lng !== next.lng || current.lat !== next.lat)
    map.value.jumpTo({ center: next })
}, { deep: 1 })

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
