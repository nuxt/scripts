<script lang="ts">
import { getCurrentInstance, h, inject, onBeforeUnmount, provide, shallowRef, useSlots, render as vueRender, watch } from 'vue'
import { bindGoogleMapsEvents, MAP_INJECTION_KEY, useGoogleMapsResource } from './useGoogleMapsResource'

// Import types locally (needed for <script setup> scope) and re-export for backwards compat
import type { Cluster, ClusterStats, MarkerClustererContext, MarkerClustererInstance, MarkerClustererOptions } from './types'
import { MARKER_CLUSTERER_INJECTION_KEY } from './types'
export type { Cluster, ClusterStats, MarkerClustererContext, MarkerClustererInstance, MarkerClustererOptions }
export { MARKER_CLUSTERER_INJECTION_KEY }
</script>

<script setup lang="ts">
const props = defineProps<{
  /**
   * Configuration options for the marker clusterer.
   * @see https://googlemaps.github.io/js-markerclusterer/interfaces/MarkerClustererOptions.html
   */
  options?: Omit<MarkerClustererOptions, 'map'>
}>()

const emit = defineEmits<{
  /**
   * Fired when a cluster is clicked.
   */
  click: [payload: MarkerClustererInstance]
  /**
   * Fired when the clusterer begins clustering markers.
   */
  clusteringbegin: [payload: MarkerClustererInstance]
  /**
   * Fired when the clusterer finishes clustering markers.
   */
  clusteringend: [payload: MarkerClustererInstance]
}>()

defineSlots<{
  default?: () => any
  renderer?: (props: { cluster: Cluster, stats: ClusterStats, map: google.maps.Map }) => any
}>()

const markerClustererEvents = [
  'click',
  'clusteringbegin',
  'clusteringend',
] as const

const slots = useSlots()
const instance = getCurrentInstance()
const mapContext = inject(MAP_INJECTION_KEY, undefined)
const clusteringVersion = shallowRef(0)

// Track containers for Vue-rendered cluster content so we can unmount them
const renderedContainers: HTMLElement[] = []

function cleanupRenderedClusters() {
  for (const container of renderedContainers) {
    vueRender(null, container)
  }
  renderedContainers.length = 0
}

onBeforeUnmount(cleanupRenderedClusters)

const markerClusterer = useGoogleMapsResource<MarkerClustererInstance>({
  async create({ map, mapsApi }) {
    const { MarkerClusterer } = await import('@googlemaps/markerclusterer')

    // Pre-load marker library so the synchronous renderer can use AdvancedMarkerElement
    if (slots.renderer) {
      await mapsApi.importLibrary('marker')
    }

    const clusterer = new MarkerClusterer({
      map,
      ...props.options,
      ...(slots.renderer
        ? {
            renderer: {
              render(cluster: Cluster, stats: ClusterStats) {
                const container = document.createElement('div')
                const vnode = h({
                  render: () => slots.renderer?.({ cluster, stats, map }),
                })
                if (instance) {
                  vnode.appContext = instance.appContext
                }
                vueRender(vnode, container)
                renderedContainers.push(container)

                const marker = new mapsApi.marker.AdvancedMarkerElement({
                  position: cluster.position,
                  content: container.firstElementChild as HTMLElement || container,
                })
                return marker
              },
            },
          }
        : {}),
    } as any) as MarkerClustererInstance

    bindGoogleMapsEvents(clusterer, emit, { withPayload: markerClustererEvents })
    clusterer.addListener('clusteringbegin', () => {
      cleanupRenderedClusters()
    })
    clusterer.addListener('clusteringend', () => {
      clusteringVersion.value++
    })
    return clusterer
  },
  cleanup(clusterer, { mapsApi }) {
    mapsApi.event.clearInstanceListeners(clusterer)
    clusterer.setMap(null)
    cleanupRenderedClusters()
  },
})

const rerenderPending = shallowRef(false)

function requestRerender() {
  rerenderPending.value = true
}

watch(
  () => rerenderPending.value && markerClusterer.value,
  (ready) => {
    if (!ready)
      return
    // Guard: map projection must be ready, otherwise MarkerClusterer.render()
    // throws "Cannot read properties of null (reading 'fromLatLngToDivPixel')"
    // Keep rerenderPending true so the request isn't lost
    if (!mapContext?.map.value?.getProjection())
      return
    rerenderPending.value = false
    try {
      markerClusterer.value!.render()
    }
    catch (err) {
      if (import.meta.dev) {
        console.error('[nuxt-scripts] MarkerClusterer render failed:', err)
      }
    }
  },
)

provide(
  MARKER_CLUSTERER_INJECTION_KEY,
  {
    markerClusterer,
    requestRerender,
    clusteringVersion,
  },
)
</script>

<template>
  <slot v-if="markerClusterer" />
</template>
