<script lang="ts">
/// <reference types="google.maps" />
import type { ElementScriptTrigger } from '#nuxt-scripts/types'
import type { HTMLAttributes, ReservedProps, ShallowRef } from 'vue'
import { useScriptTriggerElement } from '#nuxt-scripts/composables/useScriptTriggerElement'
import { useScriptGoogleMaps } from '#nuxt-scripts/registry/google-maps'
import { scriptRuntimeConfig, scriptsPrefix } from '#nuxt-scripts/utils'
import { defu } from 'defu'
import { tryUseNuxtApp, useHead, useRuntimeConfig } from 'nuxt/app'
import { computed, onBeforeUnmount, onMounted, provide, ref, shallowRef, toRaw, watch } from 'vue'
import ScriptAriaLoadingIndicator from '../ScriptAriaLoadingIndicator.vue'

import { MAP_INJECTION_KEY } from './useGoogleMapsResource'

const DIGITS_ONLY_RE = /^\d+$/
const DIGITS_PX_RE = /^\d+px$/i

export { MAP_INJECTION_KEY } from './useGoogleMapsResource'
</script>

<script lang="ts" setup>
const props = withDefaults(defineProps<{
  /**
   * Defines the trigger event to load the script.
   */
  trigger?: ElementScriptTrigger
  /**
   * Defines the Google Maps API key. Must have access to the Static Maps API as well.
   */
  apiKey?: string
  /**
   * A latitude / longitude of where to focus the map.
   */
  center?: google.maps.LatLng | google.maps.LatLngLiteral | `${string},${string}`
  /**
   * Zoom level for the map (0-21). Reactive: changing this will update the map.
   * Takes precedence over mapOptions.zoom when provided.
   */
  zoom?: number
  /**
   * Options for the map.
   */
  mapOptions?: google.maps.MapOptions
  /**
   * Defines the region of the map.
   */
  region?: string
  /**
   * Defines the language of the map
   */
  language?: string
  /**
   * Defines the version of google maps js API
   */
  version?: string
  /**
   * Defines the width of the map.
   */
  width?: number | string
  /**
   * Defines the height of the map
   */
  height?: number | string
  /**
   * Customize the root element attributes.
   */
  rootAttrs?: HTMLAttributes & ReservedProps & Record<string, unknown>
  /**
   * Map IDs for light and dark color modes.
   * When provided, the map will automatically switch styles based on color mode.
   * Requires @nuxtjs/color-mode or manual colorMode prop.
   */
  mapIds?: { light?: string, dark?: string }
  /**
   * Manual color mode control. When provided, overrides auto-detection from @nuxtjs/color-mode.
   * Accepts 'light', 'dark', or a reactive ref.
   */
  colorMode?: 'light' | 'dark'
}>(), {
  // @ts-expect-error untyped
  trigger: ['mouseenter', 'mouseover', 'mousedown'],
  width: 640,
  height: 400,
})

const emits = defineEmits<{
  /**
   * Fired when the Google Maps instance is fully loaded and ready to use. Provides access to the maps API.
   */
  ready: [e: typeof googleMaps]
  /**
   * Fired when the Google Maps script fails to load.
   */
  error: []
}>()

const apiKey = props.apiKey || scriptRuntimeConfig('googleMaps')?.apiKey
const runtimeConfig = useRuntimeConfig()

// Color mode support - try to auto-detect from @nuxtjs/color-mode
const nuxtApp = tryUseNuxtApp()
const nuxtColorMode = nuxtApp?.$colorMode as { value: string } | undefined

const currentColorMode = computed(() => {
  if (props.colorMode)
    return props.colorMode
  if (nuxtColorMode?.value)
    return nuxtColorMode.value === 'dark' ? 'dark' : 'light'
  return 'light'
})

const currentMapId = computed(() => {
  if (!props.mapIds)
    return props.mapOptions?.mapId
  return props.mapIds[currentColorMode.value] || props.mapIds.light || props.mapOptions?.mapId
})

const mapsApi = ref<typeof google.maps | undefined>()

if (import.meta.dev) {
  if (!apiKey)
    throw new Error('GoogleMaps requires an API key. Enable it in your nuxt.config:\n\n  scripts: {\n    registry: {\n      googleMaps: true\n    }\n  }\n\nThen set NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY in your .env file.\n\nAlternatively, pass `api-key` directly on the <ScriptGoogleMaps> component (note: this exposes the key client-side).')
}

const rootEl = ref<HTMLElement>()
const mapEl = ref<HTMLElement>()

const centerOverride = ref()

const trigger = useScriptTriggerElement({ trigger: props.trigger, el: rootEl })
const { load, status, onLoaded } = useScriptGoogleMaps({
  apiKey: props.apiKey,
  scriptOptions: {
    trigger,
  },
  region: props.region,
  language: props.language,
  v: props.version,
})

const options = computed(() => {
  const mapId = props.mapOptions?.styles ? undefined : (currentMapId.value || 'map')
  return defu({ center: centerOverride.value, mapId, zoom: props.zoom }, props.mapOptions, {
    center: props.center,
    zoom: 15,
  })
})
const ready = ref(false)

const map: ShallowRef<google.maps.Map | undefined> = shallowRef()

function isLocationQuery(s: string | any) {
  return typeof s === 'string' && (s.split(',').length > 2 || s.includes('+'))
}

const queryToLatLngCache = new Map<string, google.maps.LatLng | google.maps.LatLngLiteral>()

async function resolveQueryToLatLng(query: string) {
  if (query && typeof query === 'object')
    return Promise.resolve(query)
  if (queryToLatLngCache.has(query)) {
    return Promise.resolve(queryToLatLngCache.get(query))
  }

  // Use geocode proxy if available (avoids loading Places library client-side)
  const endpoints = (runtimeConfig.public['nuxt-scripts'] as any)?.endpoints
  if (endpoints?.googleMaps) {
    const data = await $fetch<{ results: Array<{ geometry: { location: { lat: number, lng: number } } }>, status: string }>(`${scriptsPrefix()}/proxy/google-maps-geocode`, {
      params: { address: query },
    })
    if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
      const loc = data.results[0].geometry.location
      const latLng = { lat: loc.lat, lng: loc.lng }
      queryToLatLngCache.set(query, latLng)
      return latLng
    }
    throw new Error(`No location found for ${query}`)
  }

  // Fallback: use Places API client-side
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<google.maps.LatLng>(async (resolve, reject) => {
    if (!mapsApi.value) {
      await load()
      // await new promise, watch until mapsApi is set
      await new Promise<void>((resolve) => {
        const _ = watch(mapsApi, () => {
          _()
          resolve()
        })
      })
    }
    const placesService = new mapsApi.value!.places.PlacesService(map.value!)
    placesService.findPlaceFromQuery({
      query,
      fields: ['name', 'geometry'],
    }, (results, status) => {
      if (status === 'OK' && results?.[0]?.geometry?.location)
        return resolve(results[0].geometry.location)
      return reject(new Error(`No location found for ${query}`))
    })
  }).then((res) => {
    queryToLatLngCache.set(query, res)
    return res
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
  // Clear cache on failure to allow retry
  const cached = Promise.resolve(p).catch((err) => {
    libraries.delete(key)
    throw err
  })
  libraries.set(key, cached)
  return cached as Promise<T>
}

const googleMaps = {
  googleMaps: mapsApi,
  map,
  resolveQueryToLatLng,
  importLibrary,
} as const

defineExpose(googleMaps)

// Shared InfoWindow group: only one InfoWindow open at a time within this map
let activeInfoWindow: google.maps.InfoWindow | undefined
provide(MAP_INJECTION_KEY, {
  map,
  mapsApi,
  activateInfoWindow(iw: google.maps.InfoWindow) {
    if (activeInfoWindow && activeInfoWindow !== iw) {
      activeInfoWindow.close()
    }
    activeInfoWindow = iw
  },
})

onMounted(() => {
  watch(ready, (v) => {
    if (v) {
      emits('ready', googleMaps)
    }
  })
  watch(status, (v) => {
    if (v === 'error') {
      emits('error')
    }
  })
  watch(options, () => {
    map.value?.setOptions(options.value)
  })
  watch([() => options.value.center, ready, map], async (next) => {
    if (!map.value) {
      return
    }
    let center = toRaw(next[0])
    if (center) {
      if (isLocationQuery(center) && ready.value) {
        center = await resolveQueryToLatLng(center as string)
      }
      map.value!.setCenter(center as google.maps.LatLng)
    }
  }, {
    immediate: true,
  })
  onLoaded(async (instance: any) => {
    mapsApi.value = await instance.maps
    // may need to transform the center before we can init the map
    const center = options.value.center as string
    const _options: google.maps.MapOptions = {
      ...options.value,
      // @ts-expect-error broken
      center: !center || isLocationQuery(center) ? undefined : center,
    }
    map.value = new mapsApi.value!.Map(mapEl.value!, _options)
    if (center && isLocationQuery(center)) {
      centerOverride.value = await resolveQueryToLatLng(center)
      map.value?.setCenter(centerOverride.value)
    }
    ready.value = true
  })
})

if (import.meta.server) {
  useHead({
    link: [
      {
        rel: 'dns-prefetch',
        href: 'https://maps.googleapis.com',
      },
    ],
  })
}

function toCssUnit(value: string | number | undefined): string | undefined {
  if (value === undefined)
    return undefined
  if (typeof value === 'number')
    return `${value}px`
  return value
}

function isPixelValue(value: string | number | undefined): boolean {
  if (typeof value === 'number')
    return true
  if (typeof value === 'string')
    return DIGITS_ONLY_RE.test(value) || DIGITS_PX_RE.test(value)
  return false
}

const rootAttrs = computed(() => {
  return defu(props.rootAttrs, {
    'aria-busy': status.value === 'loading',
    'aria-label': status.value === 'awaitingLoad'
      ? 'Google Maps'
      : status.value === 'loading'
        ? 'Google Maps Loading'
        : 'Google Maps',
    'aria-live': 'polite',
    'role': 'application',
    'style': {
      cursor: 'pointer',
      position: 'relative',
      maxWidth: '100%',
      width: toCssUnit(props.width),
      height: isPixelValue(props.width) && isPixelValue(props.height) ? 'auto' : toCssUnit(props.height),
      aspectRatio: isPixelValue(props.width) && isPixelValue(props.height) ? `${props.width}/${props.height}` : undefined,
    },
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  }) as HTMLAttributes
})

onBeforeUnmount(() => {
  // Synchronous cleanup — Vue does not await async lifecycle hooks,
  // so anything after an `await` runs as a detached microtask.
  // Note: do NOT null mapsApi here — children unmount AFTER onBeforeUnmount
  // and need mapsApi.value for clearInstanceListeners in their cleanup.
  map.value?.unbindAll()
  map.value = undefined
  mapEl.value?.firstChild?.remove()
  libraries.clear()
  queryToLatLngCache.clear()
})
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    <div v-show="ready" ref="mapEl" :style="{ width: '100%', height: '100%', maxWidth: '100%' }" />
    <slot v-if="!ready" name="placeholder" />
    <slot v-if="status !== 'awaitingLoad' && !ready" name="loading">
      <ScriptAriaLoadingIndicator />
    </slot>
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" />
    <slot />
  </div>
</template>
