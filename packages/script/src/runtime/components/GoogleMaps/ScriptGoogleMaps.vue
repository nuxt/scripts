<script lang="ts">
/// <reference types="google.maps" />
import type { ElementScriptTrigger } from '#nuxt-scripts/types'
import type { HTMLAttributes, ReservedProps, ShallowRef, WatchHandle } from 'vue'
import { useScriptTriggerElement } from '#nuxt-scripts/composables/useScriptTriggerElement'
import { useScriptGoogleMaps } from '#nuxt-scripts/registry/google-maps'
import { scriptRuntimeConfig, scriptsPrefix } from '#nuxt-scripts/utils'
import { whenever } from '@vueuse/shared'
import { defu } from 'defu'
import { tryUseNuxtApp, useHead, useRuntimeConfig } from 'nuxt/app'
import { computed, onBeforeUnmount, onMounted, provide, shallowRef, useAttrs, watch } from 'vue'

import ScriptAriaLoadingIndicator from '../ScriptAriaLoadingIndicator.vue'
import { MAP_INJECTION_KEY } from './useGoogleMapsResource'

const DIGITS_ONLY_RE = /^\d+$/
const DIGITS_PX_RE = /^\d+px$/i

export { MAP_INJECTION_KEY } from './useGoogleMapsResource'

export interface ScriptGoogleMapsProps {
  /**
     * Defines the trigger event to load the script.
     * @default ['mouseenter', 'mouseover', 'mousedown']
     */
  trigger?: ElementScriptTrigger
  /**
     * Defines the Google Maps API key. Must have access to the Static Maps API as well.
     */
  apiKey?: string
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
     * @default 640
     */
  width?: number | string
  /**
     * Defines the height of the map
     * @default 400
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
     * Accepts 'light' or 'dark'.
     */
  colorMode?: 'light' | 'dark'
}

export interface ScriptGoogleMapsExpose {
  /**
     * A reference to the loaded Google Maps API, or `undefined` if not yet loaded.
     */
  mapsApi: ShallowRef<typeof google.maps | undefined>
  /**
     * A reference to the Google Map instance, or `undefined` if not yet initialized.
     */
  map: ShallowRef<google.maps.Map | undefined>
  /**
     * Utility function to resolve a location query (e.g. "New York, NY") to latitude/longitude coordinates.
     * Uses a caching mechanism and a server-side proxy to avoid unnecessary client-side API calls.
     */
  resolveQueryToLatLng: (query: string) => Promise<google.maps.LatLng | google.maps.LatLngLiteral | undefined>
  /**
     * Utility function to dynamically import additional Google Maps libraries (e.g. "marker", "places").
     * Caches imported libraries for efficient reuse.
     */
  importLibrary: {
    (key: 'marker'): Promise<google.maps.MarkerLibrary>
    (key: 'places'): Promise<google.maps.PlacesLibrary>
    (key: 'geometry'): Promise<google.maps.GeometryLibrary>
    (key: 'drawing'): Promise<google.maps.DrawingLibrary>
    (key: 'visualization'): Promise<google.maps.VisualizationLibrary>
    (key: string): Promise<any>
  }
}

export interface ScriptGoogleMapsEmits {
  /**
     * Fired when the Google Maps instance is fully loaded and ready to use. Provides access to the maps API.
     */
  ready: [payload: ScriptGoogleMapsExpose]
  /**
     * Fired when the Google Maps script fails to load.
     */
  error: []
}

export interface ScriptGoogleMapsSlots {
  /**
     * Default slot for rendering child components (e.g. markers, info windows) that depend on the map being ready.
     */
  default?: () => any
  /**
     * Slot displayed while the map is loading. Can be used to show a custom loading indicator.
     */
  loading?: () => any
  /**
     * Slot displayed when the script is awaiting user interaction to load (based on the `trigger` prop).
     */
  awaitingLoad?: () => any
  /**
     * Slot displayed if the script fails to load.
     */
  error?: () => any
  /**
     * Slot displayed as a placeholder before the map is ready. Useful for showing a static map or skeleton.
     */
  placeholder?: () => any
}
</script>

<script lang="ts" setup>
const props = withDefaults(defineProps<ScriptGoogleMapsProps>(), {
  trigger: () => ['mouseenter', 'mouseover', 'mousedown'],
  width: 640,
  height: 400,
})

const emit = defineEmits<ScriptGoogleMapsEmits>()

defineSlots<ScriptGoogleMapsSlots>()

const apiKey = props.apiKey || scriptRuntimeConfig('googleMaps')?.apiKey

const runtimeConfig = useRuntimeConfig()

const nuxtColorMode = computed(() => {
  const value = (tryUseNuxtApp()?.$colorMode as { value: string } | undefined)?.value

  return value === 'dark' || value === 'light' ? value : undefined
})

const _colorMode = computed(() => props.colorMode || nuxtColorMode.value || 'light')

const _mapId = computed(() => props.mapIds?.[_colorMode.value] || props.mapOptions?.mapId || 'map')

const mapsApi = shallowRef<typeof google.maps>()

if (import.meta.dev) {
  if (!apiKey)
    throw new Error('GoogleMaps requires an API key. Enable it in your nuxt.config:\n\n  scripts: {\n    registry: {\n      googleMaps: true\n    }\n  }\n\nThen set NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY in your .env file.\n\nAlternatively, pass `api-key` directly on the <ScriptGoogleMaps> component (note: this exposes the key client-side).')
  const attrs = useAttrs()
  const removedProps: Record<string, string> = {
    markers: 'Use child <ScriptGoogleMapsMarker> components instead.',
    centerMarker: 'Use a child <ScriptGoogleMapsMarker :position="center" /> instead.',
    placeholderOptions: 'Use <ScriptGoogleMapsStaticMap> inside the #placeholder slot instead.',
    placeholderAttrs: 'Use <ScriptGoogleMapsStaticMap> with :img-attrs instead.',
    aboveTheFold: 'Use <ScriptGoogleMapsStaticMap loading="eager"> inside #placeholder instead.',
  }
  for (const [prop, message] of Object.entries(removedProps)) {
    if (prop in attrs)
      console.warn(`[nuxt-scripts] <ScriptGoogleMaps> prop "${prop}" was removed in v1. ${message} See https://scripts.nuxt.com/docs/migration-guide/v0-to-v1`)
  }
}

const rootEl = useTemplateRef('rootEl')
const mapEl = useTemplateRef('mapEl')

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

const mapOptions = computed<google.maps.MapOptions>(() => {
  return defu(
    { mapId: _mapId.value },
    props.mapOptions,
    { zoom: 15 },
  )
})

const isMapReady = shallowRef(false)

const map = shallowRef<google.maps.Map>()

const queryToLatLngCache = new Map<string, google.maps.LatLng | google.maps.LatLngLiteral>()

async function resolveQueryToLatLng(query: string): Promise<google.maps.LatLng | google.maps.LatLngLiteral | undefined> {
  const cached = queryToLatLngCache.get(query)

  if (cached) {
    return cached instanceof google.maps.LatLng
      ? {
          lat: cached.lat(),
          lng: cached.lng(),
        }
      : {
          lat: cached.lat,
          lng: cached.lng,
        }
  }

  // Use geocode proxy if available (recommended)
  const endpoints = (runtimeConfig.public['nuxt-scripts'] as any)?.endpoints
  if (endpoints?.googleMaps) {
    const data = await $fetch<{
      results: Array<{ geometry: { location: { lat: number, lng: number } } }>
      status: string
    }>(`${scriptsPrefix()}/proxy/google-maps-geocode`, {
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

  // Fallback: client-side Places API
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

  const result = await new Promise<google.maps.LatLng>((resolve, reject) => {
    placesService.findPlaceFromQuery(
      {
        query,
        fields: ['name', 'geometry'],
      },
      (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          resolve(results[0].geometry.location)
        }
        else {
          reject(new Error(`No location found for ${query}`))
        }
      },
    )
  })

  queryToLatLngCache.set(query, result)

  return result
}

const libraries = new Map<string, any>()

function importLibrary(key: 'marker'): Promise<google.maps.MarkerLibrary>
function importLibrary(key: 'places'): Promise<google.maps.PlacesLibrary>
function importLibrary(key: 'geometry'): Promise<google.maps.GeometryLibrary>
function importLibrary(key: 'drawing'): Promise<google.maps.DrawingLibrary>
function importLibrary(key: 'visualization'): Promise<google.maps.VisualizationLibrary>
function importLibrary(key: string): Promise<any>
function importLibrary<T>(key: string): Promise<T> {
  if (libraries.has(key)) {
    return libraries.get(key)
  }

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

defineExpose<ScriptGoogleMapsExpose>({
  mapsApi,
  map,
  resolveQueryToLatLng,
  importLibrary,
})

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

let mapElWatchHandle: WatchHandle

onMounted(() => {
  whenever(
    isMapReady,
    () => emit('ready', {
      mapsApi,
      map,
      resolveQueryToLatLng,
      importLibrary,
    }),
  )

  whenever(
    () => status.value === 'error',
    () => emit('error'),
  )

  watch(mapOptions, (mapOptions) => {
    if (!map.value)
      return

    const { center: _, zoom: __, ...rest } = mapOptions

    map.value.setOptions(rest)
  })

  watch(() => mapOptions.value.zoom, (zoom) => {
    if (!map.value || typeof zoom !== 'number') {
      return
    }

    map.value.setZoom(zoom)
  })

  watch(() => mapOptions.value.center, async (center) => {
    if (!map.value || !center) {
      return
    }

    map.value.panTo(center)
  }, {
    immediate: true,
  })

  onLoaded((instance) => {
    mapElWatchHandle = whenever(mapEl, async (mapEl) => {
      mapsApi.value = await instance.maps

      map.value = new mapsApi.value.Map(mapEl, mapOptions.value)

      isMapReady.value = true
    }, {
      immediate: true,
      once: true,
    })
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
  mapElWatchHandle?.()
})
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    <div v-show="isMapReady" ref="mapEl" :style="{ width: '100%', height: '100%', maxWidth: '100%' }" />

    <slot v-if="!isMapReady" name="placeholder" />

    <slot v-if="status !== 'awaitingLoad' && !isMapReady" name="loading">
      <ScriptAriaLoadingIndicator />
    </slot>

    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />

    <slot v-else-if="status === 'error'" name="error" />

    <slot />
  </div>
</template>
