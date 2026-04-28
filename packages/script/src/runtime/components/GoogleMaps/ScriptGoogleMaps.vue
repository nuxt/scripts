<script lang="ts">
/// <reference types="google.maps" />
import type { ElementScriptTrigger } from '#nuxt-scripts/types'
import type { HTMLAttributes, ReservedProps, ShallowRef } from 'vue'

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
   * A latitude / longitude of where to focus the map.
   *
   * @deprecated Pass `center` via `mapOptions` instead. The top-level `center`
   * prop will be removed in a future major version. When both are set,
   * `mapOptions.center` wins.
   * @see https://scripts.nuxt.com/docs/migration-guide/v0-to-v1
   */
  center?: google.maps.LatLng | google.maps.LatLngLiteral | `${string},${string}`
  /**
   * Zoom level for the map (0-21). Reactive: changing this will update the map.
   *
   * @deprecated Pass `zoom` via `mapOptions` instead. The top-level `zoom`
   * prop will be removed in a future major version. When both are set,
   * `mapOptions.zoom` wins.
   * @see https://scripts.nuxt.com/docs/migration-guide/v0-to-v1
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
   * Defines the language of the map.
   */
  language?: string
  /**
   * Defines the version of google maps js API.
   */
  version?: string
  /**
   * Defines the width of the map.
   * @default 640
   */
  width?: number | string
  /**
   * Defines the height of the map.
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
   * A reference to the loaded Google Maps API namespace (`google.maps`), or
   * `undefined` if not yet loaded.
   */
  mapsApi: ShallowRef<typeof google.maps | undefined>
  /**
   * A reference to the loaded Google Maps API namespace, or `undefined` if not
   * yet loaded.
   *
   * @deprecated Use `mapsApi` instead. The `googleMaps` alias will be removed
   * in a future major version.
   * @see https://scripts.nuxt.com/docs/migration-guide/v0-to-v1
   */
  googleMaps: ShallowRef<typeof google.maps | undefined>
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
import { useScriptTriggerElement } from '#nuxt-scripts/composables/useScriptTriggerElement'
import { useScriptGoogleMaps } from '#nuxt-scripts/registry/google-maps'
import { scriptRuntimeConfig, scriptsPrefix } from '#nuxt-scripts/utils'
import { defu } from 'defu'
import { tryUseNuxtApp, useHead, useRuntimeConfig } from 'nuxt/app'
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, shallowRef, toRaw, useAttrs, useTemplateRef, watch } from 'vue'
import ScriptAriaLoadingIndicator from '../ScriptAriaLoadingIndicator.vue'
import { defineDeprecatedAlias, MAP_INJECTION_KEY, waitForMapsReady, warnDeprecatedTopLevelMapProps } from './useGoogleMapsResource'

const props = withDefaults(defineProps<ScriptGoogleMapsProps>(), {
  // @ts-expect-error untyped
  trigger: ['mouseenter', 'mouseover', 'mousedown'],
  width: 640,
  height: 400,
})
const emits = defineEmits<ScriptGoogleMapsEmits>()
defineSlots<ScriptGoogleMapsSlots>()
const DIGITS_ONLY_RE = /^\d+$/
const DIGITS_PX_RE = /^\d+px$/i

const apiKey = props.apiKey || scriptRuntimeConfig('googleMaps')?.apiKey
const runtimeConfig = useRuntimeConfig()

const nuxtColorMode = computed(() => {
  const value = (tryUseNuxtApp()?.$colorMode as { value: string } | undefined)?.value
  return value === 'dark' || value === 'light' ? value : undefined
})

const currentColorMode = computed(() => props.colorMode || nuxtColorMode.value || 'light')

const currentMapId = computed(() => {
  if (!props.mapIds)
    return props.mapOptions?.mapId
  return props.mapIds[currentColorMode.value] || props.mapIds.light || props.mapOptions?.mapId
})

// `colorScheme` is a Google Maps init-only option that drives Cloud-based
// styling for a single mapId. We always derive it so that toggling color mode
// triggers a re-init even when the resolved mapId is unchanged (e.g. a single
// mapId hosting both Light/Dark cloud themes).
const currentColorScheme = computed<google.maps.ColorScheme | undefined>(() => {
  if (!props.mapIds && !props.colorMode && !nuxtColorMode.value)
    return undefined
  return currentColorMode.value === 'dark' ? 'DARK' as google.maps.ColorScheme : 'LIGHT' as google.maps.ColorScheme
})

const mapsApi = shallowRef<typeof google.maps | undefined>()

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
  warnDeprecatedTopLevelMapProps({ center: props.center, zoom: props.zoom })
}

const rootEl = useTemplateRef<HTMLElement>('rootEl')
const mapEl = useTemplateRef<HTMLElement>('mapEl')

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
  // JSON `styles` and `mapId` are mutually exclusive in Google Maps. When the user
  // sets `styles`, we drop `mapId` so styles apply. Otherwise fall back to a map ID
  // so `AdvancedMarkerElement` can function. The marker component warns if markers
  // are mounted against a styled (mapId-less) map.
  const mapId = props.mapOptions?.styles ? undefined : (currentMapId.value || 'DEMO_MAP_ID')
  return defu(
    { center: centerOverride.value, mapId, colorScheme: currentColorScheme.value },
    props.mapOptions,
    { center: props.center, zoom: props.zoom },
    { zoom: 15 },
  )
})
const isMapReady = ref(false)
// Drives default-slot mounting. Starts true so children mount immediately
// (preserving v0/v1 behavior where children wait for map readiness via
// `useGoogleMapsResource`). Toggled false→true when the map is re-initialized
// (mapId or colorScheme change) so child components remount and re-run their
// `whenever({ once: true })` create callbacks against the new map instance.
const slotMounted = ref(true)

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

  // Fallback: use Places API client-side. Wait for both the maps API and a
  // Map instance: resolveQueryToLatLng is publicly exposed and may be called
  // before onLoaded has populated map.value, so constructing PlacesService
  // without map would throw.
  await waitForMapsReady({ mapsApi, map, status, load })

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

const exposed: ScriptGoogleMapsExpose = {
  mapsApi,
  // Plain alias for production. In dev, replaced below with a getter that
  // emits a one-shot deprecation warning. Both forms return the same
  // shallow ref as `mapsApi`.
  googleMaps: mapsApi,
  map,
  resolveQueryToLatLng,
  importLibrary,
}

if (import.meta.dev) {
  defineDeprecatedAlias(
    exposed,
    'googleMaps',
    'mapsApi',
    '[nuxt-scripts] <ScriptGoogleMaps> expose key "googleMaps" is deprecated; use "mapsApi" instead. See https://scripts.nuxt.com/docs/migration-guide/v0-to-v1',
  )
}

defineExpose<ScriptGoogleMapsExpose>(exposed)

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
  watch(isMapReady, (v) => {
    if (v) {
      emits('ready', exposed)
    }
  })
  watch(status, (v) => {
    if (v === 'error') {
      emits('error')
    }
  })
  watch(options, () => {
    if (!map.value)
      return
    // Exclude center and zoom — they have dedicated watchers that avoid
    // resetting user interactions (pan/zoom) on unrelated re-renders.
    // Exclude mapId and colorScheme — Google Maps treats these as init-only;
    // changes are handled by the dedicated re-init watcher below.
    const { center: _, zoom: __, mapId: ___, colorScheme: ____, ...rest } = options.value
    map.value.setOptions(rest)
  })
  // Re-init map when mapId or colorScheme changes (e.g. user toggles color mode
  // with `mapIds` set or with cloud-based styling on a single mapId). Both are
  // init-only in Google Maps; setOptions is a no-op + dev warning. We tear
  // down and recreate the map preserving the user's pan/zoom state, and
  // toggle `slotMounted` so child components remount and re-bind to the new
  // map instance via their `whenever({ once: true })` create callbacks.
  watch([currentMapId, currentColorScheme], async ([newMapId, newScheme], [oldMapId, oldScheme]) => {
    if (!map.value || !mapsApi.value || !mapEl.value)
      return
    if (newMapId === oldMapId && newScheme === oldScheme)
      return
    const center = map.value.getCenter()
    const zoom = map.value.getZoom()
    // Persist the user's panned position into `centerOverride` *before* tearing
    // down. Without this, `options.value.center` recomputes (defu returns a new
    // object even when values are unchanged) and the center watcher fires when
    // `map.value` is reassigned, calling `setCenter(propsInitialCenter)` and
    // discarding the user's pan. centerOverride wins over props in `defu`, so
    // the recomputed center matches the new map's actual center: the comparison
    // guard skips the redundant setCenter.
    if (center)
      centerOverride.value = { lat: center.lat(), lng: center.lng() }
    map.value.unbindAll()
    map.value = undefined
    slotMounted.value = false
    // Clear any DOM children left by the previous Map instance — Google Maps
    // expects to render into an empty container.
    if (mapEl.value)
      mapEl.value.innerHTML = ''
    await nextTick()
    // Component may have unmounted (or refs been torn down) during nextTick;
    // bail out so we don't spin up a Map against a detached container.
    if (!mapEl.value || !mapsApi.value)
      return
    const _options: google.maps.MapOptions = {
      ...options.value,
      center: center ? { lat: center.lat(), lng: center.lng() } : options.value.center,
      zoom: zoom ?? options.value.zoom,
    }
    map.value = new mapsApi.value.Map(mapEl.value, _options)
    slotMounted.value = true
    // Re-emit `ready` so consumers can re-attach imperative state (e.g. pins
    // created via `map` ref outside of declarative children, which don't
    // automatically remount).
    emits('ready', exposed)
  })
  watch(() => options.value.zoom, (zoom) => {
    if (map.value && zoom != null)
      map.value.setZoom(zoom)
  })
  // Clear centerOverride when the controlled center prop changes so external
  // updates take effect (otherwise centerOverride, written from the user's
  // pan during re-init, would permanently win over future prop updates).
  watch([() => props.center, () => props.mapOptions?.center], () => {
    centerOverride.value = undefined
  })
  watch([() => options.value.center, isMapReady, map], async (next) => {
    if (!map.value) {
      return
    }
    let center = toRaw(next[0])
    if (center) {
      if (isLocationQuery(center) && isMapReady.value) {
        center = await resolveQueryToLatLng(center as string)
      }
      // Skip setCenter if the map is already at the same position to avoid
      // resetting user pan interactions on unrelated re-renders.
      const current = map.value!.getCenter()
      if (current) {
        const newLat = typeof (center as any).lat === 'function' ? (center as any).lat() : (center as any).lat
        const newLng = typeof (center as any).lng === 'function' ? (center as any).lng() : (center as any).lng
        if (current.lat() === newLat && current.lng() === newLng)
          return
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
      if (centerOverride.value)
        map.value?.setCenter(centerOverride.value)
    }
    isMapReady.value = true
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
  // Note: do NOT remove map DOM here — during page transitions the leave
  // animation is still playing, and tearing out the iframe leaves blank
  // space. Vue removes the parent element on actual unmount.
  map.value?.unbindAll()
  map.value = undefined
  libraries.clear()
  queryToLatLngCache.clear()
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
    <slot v-if="slotMounted" />
  </div>
</template>
