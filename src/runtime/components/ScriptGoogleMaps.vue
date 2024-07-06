<script lang="ts" setup>
/// <reference types="google.maps" />
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { HTMLAttributes, ImgHTMLAttributes, Ref, ReservedProps } from 'vue'
import { withQuery } from 'ufo'
import type { QueryObject } from 'ufo'
import { defu } from 'defu'
import type { ElementScriptTrigger } from '../types'
import { scriptRuntimeConfig } from '../utils'
import { useElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { useScriptGoogleMaps } from '../registry/google-maps'
import { resolveComponent, useHead } from '#imports'

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
  apiKey: string
  /**
   * Defines map marker location.
   */
  query?: string
  /**
   * Options for the map.
   */
  options?: google.maps.MapOptions
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
}>(), {
  // @ts-expect-error untyped
  trigger: ['mouseenter', 'mouseover', 'mousedown'],
  width: 600,
  height: 400,
})

const emits = defineEmits<{
  // our emit
  ready: [e: Ref<google.maps.Map | undefined>]
  error: []
}>()

const apiKey = props.apiKey || scriptRuntimeConfig('googleMaps')?.apiKey

if (!apiKey)
  throw new Error('GoogleMaps requires an API key. Please provide `apiKey` on the <ScriptGoogleMaps> or globally via `runtimeConfig.public.scripts.googleMaps.apiKey`.')
if (!props.query && !props.options?.center)
  throw new Error('GoogleMaps requires either a query or center prop to be set.')

const rootEl = ref<HTMLElement>()
const mapEl = ref<HTMLElement>()

const { $script } = useScriptGoogleMaps({
  apiKey: props.apiKey,
  scriptOptions: {
    trigger: useElementScriptTrigger({ trigger: props.trigger, el: rootEl }),
  },
})

const options = computed(() => {
  return defu(props.options, {
    zoom: 15,
    mapId: 'map',
  })
})
const ready = ref(false)

function queryToLocation(service: google.maps.places.PlacesService, query: string) {
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

const map: Ref<google.maps.Map | undefined> = ref()
const markers: Ref<google.maps.marker.AdvancedMarkerElement[]> = ref([])
defineExpose({
  map,
  markers,
})

onMounted(() => {
  watch(ready, (v) => {
    v && emits('ready', map)
  })
  watch($script.status, () => {
    if ($script.status.value === 'error') {
      emits('error')
    }
  })
  // create the map
  $script.then(async (instance) => {
    const maps = await instance.maps as any as typeof google.maps // some weird type issue here
    const _map = new maps.Map(mapEl.value!, options.value)
    const placesService = new maps.places.PlacesService(_map)

    watch(options, () => _map.setOptions(options.value))
    watch(() => props.query, async (query) => {
      // always clear old markers
      markers.value.forEach(marker => marker.remove())
      markers.value = []
      if (query) {
        const marker = await maps.importLibrary('marker') as google.maps.MarkerLibrary
        const location = await queryToLocation(placesService, query).catch((err) => {
          console.warn(err)
          return {
            lat: 0,
            lng: 0,
          }
        })
        _map.setCenter(location)
        markers.value.push(new marker.AdvancedMarkerElement({
          map: _map,
          position: location,
        }))
        ready.value = true
      }
    }, {
      immediate: !!props.query,
    })
    if (!props.query)
      ready.value = true
    map.value = _map
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
  const placeholderOptions: PlaceholderOptions = defu(props.placeholderOptions, {
    // only map option values
    zoom: options.value.zoom,
    center: options.value.center?.toString() || '',
  }, {
    size: `${props.width}x${props.height}`,
    key: apiKey,
    scale: 2, // we assume a high DPI to avoid hydration issues
    markers: `color:red|${props.query}`,
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
  markers.value.forEach(marker => marker.remove())
  markers.value = []
  map.value?.unbindAll()
  map.value = undefined
  mapEl.value?.firstChild?.remove()
})
</script>

<template>
  <div ref="rootEl" v-bind="rootAttrs">
    <div v-show="ready" ref="mapEl" class="script-google-maps__map" :style="{ width: '100%', height: '100%', maxWidth: '100%' }" />
    <slot v-if="!ready" :placeholder="placeholder" name="placeholder">
      <img v-bind="placeholderAttrs">
    </slot>
    <slot v-if="$script.status.value === 'loading'" name="loading">
      <ScriptLoadingIndicator color="black" />
    </slot>
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
    <slot v-else-if="$script.status.value === 'error'" name="error" />
    <slot />
  </div>
</template>
