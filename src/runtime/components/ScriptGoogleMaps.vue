<script lang="ts" setup>
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/// <reference types="google.maps" />
import { computed, onBeforeUnmount, onMounted, ref, watch, toRaw } from 'vue'
import type { HTMLAttributes, ImgHTMLAttributes, Ref, ReservedProps } from 'vue'
import { withQuery } from 'ufo'
import type { QueryObject } from 'ufo'
import { defu } from 'defu'
import { hash } from 'ohash'
import { useHead } from 'nuxt/app'
import type { ElementScriptTrigger } from '../types'
import { scriptRuntimeConfig } from '../utils'
import { useScriptTriggerElement } from '../composables/useScriptTriggerElement'
import { useScriptGoogleMaps } from '../registry/google-maps'
import ScriptAriaLoadingIndicator from './ScriptAriaLoadingIndicator.vue'

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
})

const emits = defineEmits<{
  // our emit
  ready: [e: typeof googleMaps]
  error: []
}>()

const apiKey = props.apiKey || scriptRuntimeConfig('googleMaps')?.apiKey

const mapsApi = ref<typeof google.maps | undefined>()

if (import.meta.dev && !apiKey)
  throw new Error('GoogleMaps requires an API key. Please provide `apiKey` on the <ScriptGoogleMaps> or globally via `runtimeConfig.public.scripts.googleMaps.apiKey`.')

// TODO allow a null center may need to be resolved via an API function

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
  return defu({ center: centerOverride.value }, props.mapOptions, {
    center: props.center,
    zoom: 15,
    mapId: props.mapOptions?.styles ? undefined : 'map',
  })
})
const ready = ref(false)

const map: Ref<google.maps.Map | undefined> = ref()
const mapMarkers: Ref<Map<string, Promise<google.maps.marker.AdvancedMarkerElement>>> = ref(new Map())

function isLocationQuery(s: string | any) {
  return typeof s === 'string' && (s.split(',').length > 2 || s.includes('+'))
}

function resetMapMarkerMap(_marker: google.maps.marker.AdvancedMarkerElement | Promise<google.maps.marker.AdvancedMarkerElement>) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise<void>(async (resolve) => {
    const marker = _marker instanceof Promise ? await _marker : _marker
    if (marker) {
      // @ts-expect-error broken type
      marker.setMap(null)
    }
    resolve()
  })
}

function normalizeAdvancedMapMarkerOptions(_options?: google.maps.marker.AdvancedMarkerElementOptions | `${string},${string}`) {
  const opts = typeof _options === 'string'
    ? {
        position: {
          lat: Number.parseFloat(_options.split(',')[0] || '0'),
          lng: Number.parseFloat(_options.split(',')[1] || '0'),
        },
      }
    : _options
  if (!opts.position) {
    // set default
    opts.position = {
      lat: 0,
      lng: 0,
    }
  }
}

async function createAdvancedMapMarker(_options?: google.maps.marker.AdvancedMarkerElementOptions | `${string},${string}`) {
  if (!_options)
    return
  const normalizedOptions = normalizeAdvancedMapMarkerOptions(_options)
  const key = hash({ position: normalizedOptions.position })
  if (mapMarkers.value.has(key))
    return mapMarkers.value.get(key)
  // eslint-disable-next-line no-async-promise-executor
  const p = new Promise<google.maps.marker.AdvancedMarkerElement>(async (resolve) => {
    const lib = await importLibrary('marker')
    const mapMarkerOptions = defu(toRaw(normalizedOptions), {
      map: toRaw(map.value!),
      // @ts-expect-error unified API for maps and markers
      position: normalizedOptions.location,
    })
    resolve(new lib.AdvancedMarkerElement(mapMarkerOptions))
  })
  mapMarkers.value.set(key, p)
  return p
}

const queryToLatLngCache = new Map<string, google.maps.LatLng>()

async function resolveQueryToLatLang(query: string) {
  if (query && typeof query === 'object')
    return Promise.resolve(query)
  if (queryToLatLngCache.has(query)) {
    return Promise.resolve(queryToLatLngCache.get(query))
  }
  // only if the query is a string we need to do a lookup
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
  libraries.set(key, p)
  return p as any as Promise<T>
}

const googleMaps = {
  googleMaps: mapsApi,
  map,
  createAdvancedMapMarker,
  resolveQueryToLatLang,
  importLibrary,
} as const

defineExpose(googleMaps)

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
  watch([() => props.markers, map], async () => {
    if (!map.value) {
      return
    }
    // mapMarkers is a map where we hash the next array entry as the map key
    // we need to do a diff to see what we remove or add
    const nextMap = new Map((props.markers || []).map(m => [hash({ position: normalizeAdvancedMapMarkerOptions(m).position }), m]))
    // compare idsToMatch in nextMap, if we're missing an id, we need to remove it
    const toRemove = new Set([
      ...mapMarkers.value.keys(),
    ].filter(k => !nextMap.has(k)))
    // compare to existing
    const toAdd = new Set([...nextMap.keys()].filter(k => !mapMarkers.value.has(k)))
    // do a diff of next and prev
    const centerHash = hash({ position: options.value.center })
    for (const key of toRemove) {
      if (key === centerHash) {
        continue
      }
      const marker = await mapMarkers.value.get(key)
      if (marker) {
        resetMapMarkerMap(marker)
          .then(() => {
            mapMarkers.value.delete(key)
          })
      }
    }
    for (const k of toAdd) {
      createAdvancedMapMarker(nextMap.get(k))
    }
  }, {
    immediate: true,
    deep: true,
  })
  watch([() => options.value.center, ready, map], async (next, prev) => {
    if (!map.value) {
      return
    }
    let center = toRaw(next[0])
    if (center) {
      if (isLocationQuery(center) && ready.value) {
        // need to resolve center from query
        center = await resolveQueryToLatLang(center as string)
      }
      map.value!.setCenter(center as google.maps.LatLng)
      if (typeof props.centerMarker === 'undefined' || props.centerMarker) {
        if (options.value.mapId) {
          // not allowed to use advanced markers with styles
          return
        }
        if (prev[0]) {
          const prevCenterHash = hash({ position: prev[0] })
          if (mapMarkers.value.has(prevCenterHash)) {
            resetMapMarkerMap(mapMarkers.value.get(prevCenterHash)!)
              .then(() => {
                mapMarkers.value.delete(prevCenterHash)
              })
          }
        }
        createAdvancedMapMarker({ position: center })
      }
    }
  }, {
    immediate: true,
  })
  onLoaded(async (instance) => {
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
      // need to resolve center
      centerOverride.value = await resolveQueryToLatLang(center)
      map.value?.setCenter(centerOverride.value)
    }
    ready.value = true
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

function transformMapStyles(styles: google.maps.MapTypeStyle[]) {
  return styles.map((style) => {
    const feature = style.featureType ? `feature:${style.featureType}` : ''
    const element = style.elementType ? `element:${style.elementType}` : ''
    const rules = (style.stylers || []).map((styler) => {
      return Object.entries(styler).map(([key, value]) => {
        if (key === 'color' && typeof value === 'string') {
          value = value.replace('#', '0x')
        }
        return `${key}:${value}`
      }).join('|')
    }).filter(Boolean).join('|')
    return [feature, element, rules].filter(Boolean).join('|')
  }).filter(Boolean)
}

const placeholder = computed(() => {
  let center = options.value.center
  if (center && typeof center === 'object') {
    center = `${center.lat},${center.lng}`
  }
  // @ts-expect-error lazy type
  const placeholderOptions: PlaceholderOptions = defu(props.placeholderOptions, {
    // only map option values
    zoom: options.value.zoom,
    center,
  }, {
    size: `${props.width}x${props.height}`,
    key: apiKey,
    scale: 2, // we assume a high DPI to avoid hydration issues
    style: props.mapOptions?.styles ? transformMapStyles(props.mapOptions.styles) : undefined,
    markers: [
      ...(props.markers || []),
      center,
    ]
      .filter(Boolean)
      .map((m) => {
        if (typeof m === 'object' && m.location) {
          m = m.location
        }
        if (typeof m === 'object' && m.lat) {
          return `${m.lat},${m.lng}`
        }
        return m
      })
      .join('|'),
  })
  return withQuery('https://maps.googleapis.com/maps/api/staticmap', placeholderOptions as QueryObject)
})

const placeholderAttrs = computed(() => {
  return defu(props.placeholderAttrs, {
    src: placeholder.value,
    alt: 'Google Maps Static Map',
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
    'aria-busy': status.value === 'loading',
    'aria-label': status.value === 'awaitingLoad'
      ? 'Google Maps Static Map'
      : status.value === 'loading'
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
    ...(trigger instanceof Promise ? trigger.ssrAttrs || {} : {}),
  }) as HTMLAttributes
})

onBeforeUnmount(async () => {
  await Promise.all([...mapMarkers.value.entries()].map(([,marker]) => resetMapMarkerMap(marker)))
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
    <slot v-if="status !== 'awaitingLoad' && !ready" name="loading">
      <ScriptAriaLoadingIndicator />
    </slot>
    <slot v-if="status === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="status === 'error'" name="error" />
    <slot />
  </div>
</template>
