<script lang="ts" setup>
/// <reference types="google.maps" />
import { computed, onBeforeUnmount, onMounted, ref, watch, toRaw } from 'vue'
import type { HTMLAttributes, ImgHTMLAttributes, Ref, ReservedProps } from 'vue'
import { withQuery } from 'ufo'
import type { QueryObject } from 'ufo'
import { defu } from 'defu'
import { hash } from 'ohash'
import type { ElementScriptTrigger } from '../types'
import { scriptRuntimeConfig } from '../utils'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptGoogleMaps } from '../registry/google-maps'
import { resolveComponent, useHead } from '#imports'
import AdvancedMarkerElement = google.maps.marker.AdvancedMarkerElement

interface PlaceholderOptions {
  width?: string | number
  height?: string | number
  center?: string
  zoom?: number
  size?: string
  scale?: number
  format?: 'png' | 'jpg' | 'gif' | 'png8' | 'png32' | 'jpg-baseline'
  maptype?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid'
  language?: string
  region?: string
  markers?: string
  path?: string
  visible?: string
  style?: string
  map_id?: string
  key?: string
  signature?: string
}

const props = withDefaults(defineProps<{
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
  /**
   * Is Google Maps being rendered above the fold?
   * This will load the placeholder image with higher priority.
   */
  aboveTheFold?: boolean
  /**
   * Defines the Google Maps API key. Must have access to the Static Maps API as well.
   */
  apiKey?: string
  /**
   * A latitude / longitude of where to focus the map.
   */
  center?: google.maps.LatLng | google.maps.LatLngLiteral | `${string},${string}`
  /**
   * Should a marker be displayed on the map where the centre is.
   */
  centerMarker?: boolean
  /**
   * Options for the map.
   */
  mapOptions?: Omit<google.maps.MapOptions, 'center'>
  /**
   * Defines the width of the map.
   */
  width?: number | string
  /**
   * Defines the height of the map
   */
  height?: number | string
  /**
   * Customize the placeholder image attributes.
   *
   * @see https://developers.google.com/maps/documentation/maps-static/start.
   */
  placeholderOptions?: PlaceholderOptions
  /**
   * Customize the placeholder image attributes.
   */
  placeholderAttrs?: ImgHTMLAttributes & ReservedProps & Record<string, unknown>
  /**
   * Customize the root element attributes.
   */
  rootAttrs?: HTMLAttributes & ReservedProps & Record<string, unknown>
  /**
   * Extra Markers to add to the map.
   */
  markers?: (`${string},${string}` | google.maps.marker.AdvancedMarkerElementOptions)[]
}>(), {
  // @ts-expect-error untyped
  trigger: ['mouseenter', 'mouseover', 'mousedown'],
  width: 640,
  height: 400,
  centerMarker: true,
})

const emits = defineEmits<{
  // our emit
  ready: [e: Ref<google.maps.Map | undefined>]
  error: []
}>()

const apiKey = props.apiKey || scriptRuntimeConfig('googleMaps')?.apiKey

const mapsApi = ref<typeof google.maps | undefined>()

if (import.meta.dev && !apiKey)
  throw new Error('GoogleMaps requires an API key. Please provide `apiKey` on the <ScriptGoogleMaps> or globally via `runtimeConfig.public.scripts.googleMaps.apiKey`.')

// TODO allow a null center may need to be resolved via an API function

const rootEl = ref<HTMLElement>()
const mapEl = ref<HTMLElement>()

const { $script } = useScriptGoogleMaps({
  apiKey: props.apiKey,
  scriptOptions: {
    trigger: useScriptTriggerElement({ trigger: props.trigger, el: rootEl }),
  },
})

const options = computed(() => {
  return defu(props.mapOptions, {
    center: props.center,
    zoom: 15,
    mapId: 'map',
  })
})
const ready = ref(false)

const map: Ref<google.maps.Map | undefined> = ref()
const mapMarkers: Ref<Map<string, google.maps.marker.AdvancedMarkerElement>> = ref(new Map())

async function createAdvancedMapMarker(_options: google.maps.marker.AdvancedMarkerElementOptions | `${string},${string}`) {
  const lib = await importLibrary('marker')
  const options = typeof _options === 'string'
    ? {
        position: {
          lat: Number.parseFloat(_options.split(',')[0]),
          lng: Number.parseFloat(_options.split(',')[1]),
        },
      }
    : _options
  const mapMarkerOptions = defu(toRaw(options), {
    map: toRaw(map.value),
    position: options.location,
  })
  const marker = new lib.AdvancedMarkerElement(mapMarkerOptions)
  // create new marker
  mapMarkers.value.set(hash(_options), marker)
  return marker
}

async function resolveQueryToLatLang(query: string) {
  if (typeof query === 'object')
    return Promise.resolve(query)
  // only if the query is a string we need to do a lookup
  return new Promise<google.maps.LatLng>((resolve, reject) => {
    service.findPlaceFromQuery({
      query,
      fields: ['name', 'geometry'],
    }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location)
        return resolve(results[0].geometry.location)
      return reject(new Error(`No location found for ${query}`))
    })
  })
}

const libraries = new Map<string, any>()

function importLibrary(key: 'marker'): Promise<google.maps.MarkerLibrary>
function importLibrary(key: 'places'): Promise<google.maps.PlacesLibrary>
function importLibrary(key: 'geometry'): Promise<google.maps.GeometryLibrary>
function importLibrary(key: 'drawing'): Promise<google.maps.DrawingLibrary>
function importLibrary(key: 'visualization'): Promise<google.maps.VisualizationLibrary>
function importLibrary(key: string): Promise<any>
function importLibrary<T>(key: string): Promise<T> {
  if (libraries.has(key))
    return libraries.get(key)
  const p = mapsApi.value?.importLibrary(key) || new Promise((resolve) => {
    const stop = watch(mapsApi, (api) => {
      if (api) {
        const p = api.importLibrary(key)
        resolve(p)
        stop()
      }
    }, { immediate: true })
  })
  libraries.set(key, p)
  return p
}

const googleMaps = {
  googleMaps: mapsApi,
  map,
  createAdvancedMapMarker,
  resolveQueryToLatLang,
  importLibrary,
}

defineExpose(googleMaps)

onMounted(() => {
  watch(ready, (v) => {
    if (v) {
      emits('ready', googleMaps)
    }
  })
  watch($script.status, (v) => {
    if (v === 'error') {
      emits('error')
    }
  })
  watch(options, () => {
    map.value?.setOptions(options.value)
  })
  watch([() => props.markers, map], () => {
    if (!map.value) {
      return
    }
    // mapMarkers is a map where we hash the next array entry as the map key
    // we need to do a diff to see what we remove or add
    const nextMap = new Map((props.markers || []).map(m => [hash(m), m]))
    // compare idsToMatch in nextMap, if we're missing an id, we need to remove it
    const toRemove = new Set([
      ...mapMarkers.value.keys(),
    ].filter(k => !nextMap.has(k)))
    // compare to existing
    const toAdd = new Set([...nextMap.keys()].filter(k => !mapMarkers.value.has(k)))
    // do a diff of next and prev
    const centerHash = hash({ position: options.value.center })
    toRemove.forEach((key) => {
      if (key === centerHash) {
        return
      }
      mapMarkers.value.get(key)?.setMap(null)
      mapMarkers.value.delete(key)
    })
    for (const k of toAdd) {
      createAdvancedMapMarker(nextMap.get(k))
    }
  }, {
    immediate: true,
    deep: true,
  })
  watch([options, ready], (next, prev) => {
    if (!map.value) {
      return
    }
    map.value.setCenter(next[0].center)
    if (props.centerMarker) {
      const prevCenterHash = hash({ position: prev[0].center })
      mapMarkers.value.get(prevCenterHash)?.setMap(null)
      mapMarkers.value.delete(prevCenterHash)
      createAdvancedMapMarker({
        position: next[0].center,
      })
    }
  }, {
    immediate: true,
    deep: true,
  })
  // create the map
  $script.then(async (instance) => {
    // resolve the google maps api
    mapsApi.value = await instance.maps as any as typeof google.maps // some weird type issue here
    // init the map
    map.value = new mapsApi.value!.Map(mapEl.value!, options.value)
    // ready to use
    ready.value = true
    // if the mapOptions.center is a string not in the lat lang format, we need to resolve it to a lat lan using resolveQueryToLatLang

    // const placesService = new maps.places.PlacesService(_map)
    // if (!props.query)
    //   ready.value = true
  })
})

if (import.meta.server) {
  useHead({
    link: [
      {
        rel: props.aboveTheFold ? 'preconnect' : 'dns-prefetch',
        href: 'https://maps.googleapis.com',
      },
    ],
  })
}

const placeholder = computed(() => {
  let center = options.value.center
  if (typeof center === 'object') {
    center = `${center.lat},${center.lng}`
  }
  const placeholderOptions: PlaceholderOptions = defu(props.placeholderOptions, {
    // only map option values
    zoom: options.value.zoom,
    center,
  }, {
    size: `${props.width}x${props.height}`,
    key: apiKey,
    scale: 2, // we assume a high DPI to avoid hydration issues
    markers: [
      ...(props.markers || []),
      center,
    ]
      .map((m) => {
        if (typeof m === 'object' && m.location) {
          m = m.location
        }
        if (typeof m === 'object' && m.lat) {
          return `${m.lat},${m.lng}`
        }
        return m
      })
      .filter(Boolean)
      .join('|'),
  })
  return withQuery('https://maps.googleapis.com/maps/api/staticmap', placeholderOptions as QueryObject)
})

const placeholderAttrs = computed(() => {
  return defu(props.placeholderAttrs, {
    src: placeholder.value,
    alt: props.query || '',
    loading: props.aboveTheFold ? 'eager' : 'lazy',
    style: {
      cursor: 'pointer',
      width: '100%',
      objectFit: 'cover',
      height: '100%',
    },
  } satisfies ImgHTMLAttributes)
})

const rootAttrs = computed(() => {
  return defu(props.rootAttrs, {
    'aria-busy': $script.status.value === 'loading',
    'aria-label': $script.status.value === 'awaitingLoad'
      ? 'Google Maps Static Map'
      : $script.status.value === 'loading'
        ? 'Google Maps Map Embed Loading'
        : 'Google Maps Embed',
    'aria-live': 'polite',
    'role': 'application',
    'style': {
      cursor: 'pointer',
      position: 'relative',
      maxWidth: '100%',
      width: `${props.width}px`,
      height: `'auto'`,
      aspectRatio: `${props.width}/${props.height}`,
    },
  }) as HTMLAttributes
})

const ScriptLoadingIndicator = resolveComponent('ScriptLoadingIndicator')

onBeforeUnmount(() => {
  mapMarkers.value.forEach(marker => marker.remove())
  mapMarkers.value.clear()
  map.value?.unbindAll()
  map.value = undefined
  mapEl.value?.firstChild?.remove()
})
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    <div v-show="ready" ref="mapEl" :style="{ width: '100%', height: '100%', maxWidth: '100%' }" />
    <slot v-if="!ready" :placeholder="placeholder" name="placeholder">
      <img v-bind="placeholderAttrs">
    </slot>
    <slot v-if="$script.status.value !== 'awaitingLoad' && !ready" name="loading">
      <ScriptLoadingIndicator color="black" />
    </slot>
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="$script.status.value === 'error'" name="error" />
    <slot />
  </div>
</template>
