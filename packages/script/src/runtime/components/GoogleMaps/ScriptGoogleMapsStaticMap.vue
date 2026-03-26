<script lang="ts">
/// <reference types="google.maps" />
import type { QueryObject } from 'ufo'
import type { ImgHTMLAttributes, ReservedProps } from 'vue'
import { scriptRuntimeConfig } from '#nuxt-scripts/utils'
import { defu } from 'defu'
import { useHead, useRuntimeConfig } from 'nuxt/app'
import { withQuery } from 'ufo'
import { computed, onMounted, ref } from 'vue'
</script>

<script lang="ts" setup>
export type StaticMapFormat = 'png' | 'jpg' | 'gif' | 'png8' | 'png32' | 'jpg-baseline'
export type StaticMapType = 'roadmap' | 'satellite' | 'terrain' | 'hybrid'

const props = withDefaults(defineProps<{
  /**
   * The center of the map. Accepts a "lat,lng" string or a LatLngLiteral object.
   */
  center?: string | { lat: number, lng: number }
  /**
   * Zoom level (0-21).
   */
  zoom?: number
  /**
   * Explicit pixel size for the Static Maps API request, e.g. "640x400".
   * When omitted, the component measures its rendered dimensions on mount and uses those.
   * Falls back to "640x400" during SSR or when dimensions can't be measured.
   */
  size?: `${number}x${number}`
  /**
   * Device pixel ratio for the static map image (1, 2, or 4).
   */
  scale?: 1 | 2 | 4
  /**
   * Image format.
   */
  format?: StaticMapFormat
  /**
   * Map type.
   */
  maptype?: StaticMapType
  /**
   * Cloud-based map styling ID.
   */
  mapId?: string
  /**
   * Map markers. Supports multiple markers via string array.
   * @see https://developers.google.com/maps/documentation/maps-static/start#Markers
   */
  markers?: string | string[]
  /**
   * Polyline paths. Supports multiple paths via string array.
   * @see https://developers.google.com/maps/documentation/maps-static/start#Paths
   */
  path?: string | string[]
  /**
   * Locations that should be visible on the map.
   */
  visible?: string | string[]
  /**
   * Map styling. Accepts raw Static Maps API style strings or Google Maps JS API MapTypeStyle objects.
   */
  style?: string | string[] | google.maps.MapTypeStyle[]
  /**
   * Language code for map labels.
   */
  language?: string
  /**
   * Region bias.
   */
  region?: string
  /**
   * Digital signature for requests without an API key.
   */
  signature?: string
  /**
   * API key override. When the proxy is enabled, this is ignored and the server-side key is used instead.
   */
  apiKey?: string
  /**
   * CSS width for the container element.
   */
  width?: number | string
  /**
   * CSS height for the container element.
   */
  height?: number | string
  /**
   * Image loading strategy.
   */
  loading?: 'eager' | 'lazy'
  /**
   * Object-fit for the image within its container.
   */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /**
   * Additional attributes for the `<img>` element.
   */
  imgAttrs?: ImgHTMLAttributes & ReservedProps & Record<string, unknown>
}>(), {
  zoom: 15,
  scale: 2,
  loading: 'lazy',
  objectFit: 'cover',
  width: 640,
  height: 400,
})

const apiKey = props.apiKey || scriptRuntimeConfig('googleMaps')?.apiKey
const runtimeConfig = useRuntimeConfig()
const proxyConfig = (runtimeConfig.public['nuxt-scripts'] as any)?.googleStaticMapsProxy

if (import.meta.dev) {
  if (!apiKey && !proxyConfig?.enabled)
    console.warn('[nuxt-scripts] ScriptGoogleMapsStaticMap requires a Google Maps API key with Static Maps API access. Set NUXT_PUBLIC_SCRIPTS_GOOGLE_MAPS_API_KEY in your .env, or enable the proxy via `scripts.registry.googleMaps`.')
}

const rootEl = ref<HTMLElement>()
const measuredSize = ref<string>()

onMounted(() => {
  if (props.size || !rootEl.value)
    return
  const { offsetWidth, offsetHeight } = rootEl.value
  if (offsetWidth > 0 && offsetHeight > 0) {
    measuredSize.value = `${offsetWidth}x${offsetHeight}`
  }
})

function toCssUnit(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value
}

const PIXEL_VALUE_RE = /^\d+(?:px)?$/i

function isPixelValue(value: string | number): boolean {
  if (typeof value === 'number')
    return true
  return PIXEL_VALUE_RE.test(value)
}

function transformMapStyles(styles: google.maps.MapTypeStyle[]): string[] {
  return styles.map((s) => {
    const feature = s.featureType ? `feature:${s.featureType}` : ''
    const element = s.elementType ? `element:${s.elementType}` : ''
    const rules = (s.stylers || []).map((styler) => {
      return Object.entries(styler).map(([key, value]) => {
        if (key === 'color' && typeof value === 'string')
          value = value.replace('#', '0x')
        return `${key}:${value}`
      }).join('|')
    }).filter(Boolean).join('|')
    return [feature, element, rules].filter(Boolean).join('|')
  }).filter(Boolean)
}

function resolveStyle(style: string | string[] | google.maps.MapTypeStyle[] | undefined): string | string[] | undefined {
  if (!style)
    return undefined
  if (typeof style === 'string')
    return style
  if (Array.isArray(style) && style.length > 0 && typeof style[0] === 'string')
    return style as string[]
  return transformMapStyles(style as google.maps.MapTypeStyle[])
}

function resolveCenter(center: string | { lat: number, lng: number } | undefined): string | undefined {
  if (!center)
    return undefined
  if (typeof center === 'string')
    return center
  return `${center.lat},${center.lng}`
}

const resolvedSize = computed(() => {
  if (props.size)
    return props.size
  if (measuredSize.value)
    return measuredSize.value
  // SSR fallback: derive from width/height if both are pixel values
  if (isPixelValue(props.width) && isPixelValue(props.height))
    return `${Number.parseInt(String(props.width))}x${Number.parseInt(String(props.height))}`
  return '640x400'
})

const src = computed(() => {
  const query: Record<string, any> = {
    center: resolveCenter(props.center),
    zoom: props.zoom,
    size: resolvedSize.value,
    scale: props.scale,
    format: props.format,
    maptype: props.maptype,
    map_id: props.mapId,
    markers: props.markers,
    path: props.path,
    visible: props.visible,
    style: resolveStyle(props.style),
    language: props.language,
    region: props.region,
    signature: props.signature,
    key: proxyConfig?.enabled ? undefined : apiKey,
  }

  // Remove undefined values
  for (const key of Object.keys(query)) {
    if (query[key] === undefined)
      delete query[key]
  }

  const baseUrl = proxyConfig?.enabled
    ? '/_scripts/proxy/google-static-maps'
    : 'https://maps.googleapis.com/maps/api/staticmap'

  return withQuery(baseUrl, query as QueryObject)
})

const imgAttributes = computed(() => {
  return defu(props.imgAttrs, {
    src: src.value,
    alt: 'Google Maps',
    loading: props.loading,
    style: {
      width: '100%',
      height: '100%',
      objectFit: props.objectFit,
      display: 'block',
    },
  } satisfies ImgHTMLAttributes)
})

const rootStyle = computed(() => ({
  width: toCssUnit(props.width),
  height: toCssUnit(props.height),
  maxWidth: '100%',
  overflow: 'hidden',
}))

if (import.meta.server) {
  useHead({
    link: [
      {
        rel: props.loading === 'eager' ? 'preconnect' : 'dns-prefetch',
        href: proxyConfig?.enabled ? undefined : 'https://maps.googleapis.com',
      },
    ].filter(l => l.href),
  })
}

defineExpose({ src })
</script>

<template>
  <div ref="rootEl" :style="rootStyle">
    <slot :src="src">
      <img v-bind="imgAttributes">
    </slot>
  </div>
</template>
