<script lang="ts">
import type * as Leaflet from 'leaflet'
import type { CSSProperties, HTMLAttributes, ReservedProps, ShallowRef } from 'vue'
import type { ElementScriptTrigger } from '#nuxt-scripts/types'

export { LEAFLET_MAP_INJECTION_KEY } from './useLeafletResource'

export interface ScriptLeafletMapProps {
  /**
   * Defines when the Leaflet script loads.
   * @default 'visible'
   */
  trigger?: ElementScriptTrigger
  /** Initial and reactively controlled map center. */
  center: Leaflet.LatLngExpression
  /** Initial and reactively controlled zoom level. @default 13 */
  zoom?: number
  /** Options passed to `L.map`. `center` and `zoom` use their dedicated props. */
  options?: Leaflet.MapOptions
  /** Inject Leaflet's styles and embedded default marker images. @default true */
  injectStyles?: boolean
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

export interface ScriptLeafletMapExpose {
  leaflet: ShallowRef<typeof Leaflet | undefined>
  map: ShallowRef<Leaflet.Map | undefined>
  load: () => Promise<unknown> | unknown
}

export interface ScriptLeafletMapEmits {
  'ready': [payload: ScriptLeafletMapExpose]
  'error': [error: Error]
  'click': [event: Leaflet.LeafletMouseEvent]
  'move': [event: Leaflet.LeafletEvent]
  'moveend': [event: Leaflet.LeafletEvent]
  'zoom': [event: Leaflet.LeafletEvent]
  'zoomend': [event: Leaflet.LeafletEvent]
  'update:center': [center: Leaflet.LatLng]
  'update:zoom': [zoom: number]
}

export interface ScriptLeafletMapSlots {
  default?: () => any
  loading?: () => any
  awaitingLoad?: () => any
  error?: (props: { error: Error }) => any
  placeholder?: () => any
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, shallowRef, toRaw, useTemplateRef, watch } from 'vue'
import { useScriptTriggerElement } from '#nuxt-scripts/composables/useScriptTriggerElement'
import { useScriptLeaflet } from '#nuxt-scripts/registry/leaflet'
import ScriptAriaLoadingIndicator from '../ScriptAriaLoadingIndicator.vue'
import { LEAFLET_MAP_INJECTION_KEY } from './useLeafletResource'

const props = withDefaults(defineProps<ScriptLeafletMapProps>(), {
  trigger: 'visible',
  zoom: 13,
  injectStyles: true,
  width: 640,
  height: 400,
  ariaLabel: 'Interactive map',
  interactive: true,
})
const emit = defineEmits<ScriptLeafletMapEmits>()
defineSlots<ScriptLeafletMapSlots>()

const rootEl = useTemplateRef<HTMLElement>('rootEl')
const mapEl = useTemplateRef<HTMLElement>('mapEl')
const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })
const { load, status, onLoaded } = useScriptLeaflet({
  injectStyles: props.injectStyles,
  scriptOptions: { trigger },
})

const leaflet = shallowRef<typeof Leaflet>()
const map = shallowRef<Leaflet.Map>()
const isMapReady = shallowRef(false)
const loadError = shallowRef(new Error('Leaflet failed to load'))
let isUnmounted = false

const exposed: ScriptLeafletMapExpose = { leaflet, map, load }
defineExpose<ScriptLeafletMapExpose>(exposed)
provide(LEAFLET_MAP_INJECTION_KEY, { leaflet, map })

const mapEvents = ['click', 'move', 'moveend', 'zoom', 'zoomend'] as const

function bindMapEvents(instance: Leaflet.Map): void {
  for (const eventName of mapEvents) {
    instance.on(eventName, (event) => {
      ;(emit as any)(eventName, event)
      if (eventName === 'moveend')
        emit('update:center', instance.getCenter())
      if (eventName === 'zoomend')
        emit('update:zoom', instance.getZoom())
    })
  }
}

function mapOptions(): Leaflet.MapOptions {
  if (props.interactive)
    return { ...props.options }

  return {
    ...props.options,
    boxZoom: false,
    doubleClickZoom: false,
    dragging: false,
    keyboard: false,
    scrollWheelZoom: false,
    touchZoom: false,
    zoomControl: false,
  }
}

onMounted(() => {
  onLoaded((instance: { L: typeof Leaflet }) => {
    if (isUnmounted || !mapEl.value)
      return

    leaflet.value = instance.L
    const mapInstance = instance.L.map(mapEl.value, mapOptions())
    mapInstance.setView(toRaw(props.center), props.zoom, { animate: false })
    bindMapEvents(mapInstance)
    map.value = mapInstance
    isMapReady.value = true
    emit('ready', exposed)
  })
})

watch(status, (value) => {
  if (value !== 'error')
    return
  loadError.value = new Error('Leaflet failed to load')
  emit('error', loadError.value)
})

watch(() => props.center, (center) => {
  if (!map.value || !leaflet.value)
    return
  const next = leaflet.value.latLng(toRaw(center))
  if (!map.value.getCenter().equals(next))
    map.value.panTo(next)
}, { deep: 1 })

watch(() => props.zoom, (zoom) => {
  if (map.value && map.value.getZoom() !== zoom)
    map.value.setZoom(zoom)
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
  map.value?.off()
  map.value?.remove()
  map.value = undefined
})
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    <div
      v-show="isMapReady"
      ref="mapEl"
      :aria-hidden="interactive ? undefined : 'true'"
      :aria-label="interactive ? ariaLabel : undefined"
      :inert="interactive ? undefined : true"
      :style="{ width: '100%', height: '100%', maxWidth: '100%' }"
    />
    <slot v-if="!isMapReady" name="placeholder" />
    <slot v-if="status === 'loading'" name="loading">
      <ScriptAriaLoadingIndicator />
    </slot>
    <slot v-else-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" :error="loadError">
      <p role="alert">
        The map could not be loaded.
      </p>
    </slot>
    <slot />
  </div>
</template>
