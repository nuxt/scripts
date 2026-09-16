<script lang="ts">
export type {
  ScriptMapLibreGeoJsonEmits,
  ScriptMapLibreGeoJsonLayer,
  ScriptMapLibreGeoJsonProps,
  ScriptMapLibreGeoJsonResource,
} from './types'
</script>

<script setup lang="ts">
import type * as MapLibreGl from 'maplibre-gl'
import type { ScriptMapLibreGeoJsonEmits, ScriptMapLibreGeoJsonProps, ScriptMapLibreGeoJsonResource } from './types'
import { toRaw, watch } from 'vue'
import { reportMapLibreResourceError, useMapLibreResource } from './useMapLibreResource'

const props = defineProps<ScriptMapLibreGeoJsonProps>()

const emit = defineEmits<ScriptMapLibreGeoJsonEmits>()

let ownedLayerIds: string[] = []
let ownedSourceId: string | undefined
let appliedSignature: string | undefined
let layerSubscriptions: MapLibreGl.Subscription[] = []
let restoreCursor: string | undefined

/**
 * Content signature of every prop that forces a source and layer rebuild.
 * An inline array or object literal changes identity on each parent render, so
 * the component compares content instead of identity.
 */
function resourceSignature(): string {
  return JSON.stringify([props.sourceId, props.sourceOptions ?? null, props.layers, props.beforeId ?? null])
}

/** Applies the `cursor` prop while the pointer is over an owned layer. */
function applyCursor(map: MapLibreGl.Map, cursor: string | undefined): void {
  const canvas = map.getCanvas()
  if (!canvas)
    return
  if (cursor === undefined) {
    if (restoreCursor !== undefined)
      canvas.style.cursor = restoreCursor
    restoreCursor = undefined
    return
  }
  restoreCursor ??= canvas.style.cursor
  canvas.style.cursor = cursor
}

function unbindLayerEvents(map: MapLibreGl.Map): void {
  for (const subscription of layerSubscriptions)
    subscription.unsubscribe()
  layerSubscriptions = []
  if (restoreCursor !== undefined)
    applyCursor(map, undefined)
}

/**
 * Binds the component's events to the layers it owns. MapLibre treats the layer
 * array as one group, so `mouseenter` and `mouseleave` fire once per group.
 */
function bindLayerEvents(map: MapLibreGl.Map): void {
  unbindLayerEvents(map)
  if (!ownedLayerIds.length)
    return
  const layerIds = [...ownedLayerIds]
  layerSubscriptions = [
    map.on('click', layerIds, event => emit('click', event)),
    map.on('mouseenter', layerIds, (event) => {
      if (props.cursor)
        applyCursor(map, props.cursor)
      emit('mouseenter', event)
    }),
    map.on('mouseleave', layerIds, (event) => {
      applyCursor(map, undefined)
      emit('mouseleave', event)
    }),
  ]
}

function removeOwnedResources(map: MapLibreGl.Map): void {
  unbindLayerEvents(map)
  for (const layerId of [...ownedLayerIds].reverse()) {
    if (map.getLayer(layerId))
      map.removeLayer(layerId)
  }
  ownedLayerIds = []
  if (ownedSourceId && map.getSource(ownedSourceId))
    map.removeSource(ownedSourceId)
  ownedSourceId = undefined
  appliedSignature = undefined
}

function syncResources(map: MapLibreGl.Map): void {
  if (!map.isStyleLoaded())
    return

  removeOwnedResources(map)
  const sourceId = props.sourceId
  try {
    map.addSource(sourceId, {
      ...toRaw(props.sourceOptions),
      type: 'geojson',
      data: toRaw(props.data),
    })
    ownedSourceId = sourceId

    for (const layer of props.layers) {
      const nextLayer = {
        ...toRaw(layer),
        source: layer.source || sourceId,
      } as MapLibreGl.LayerSpecification
      map.addLayer(nextLayer, props.beforeId)
      ownedLayerIds.push(nextLayer.id)
    }
    appliedSignature = resourceSignature()
    bindLayerEvents(map)
  }
  catch (error) {
    removeOwnedResources(map)
    throw error
  }
}

/** Runs a rebuild outside the initial creation, where no caller can catch it. */
function trySyncResources(map: MapLibreGl.Map): void {
  try {
    syncResources(map)
  }
  catch (error) {
    reportMapLibreResourceError(error, failure => emit('error', failure))
  }
}

const geoJson = useMapLibreResource<ScriptMapLibreGeoJsonResource>({
  create({ map }) {
    const onStyleLoad = () => trySyncResources(map)
    const onLoad = () => {
      if (!ownedSourceId)
        trySyncResources(map)
    }
    map.on('style.load', onStyleLoad)
    map.on('load', onLoad)
    // A failed first sync must not discard the resource. The style and prop
    // listeners stay registered, so a corrected layer rebuilds without a remount.
    trySyncResources(map)
    return { map, onLoad, onStyleLoad }
  },
  onError: error => emit('error', error),
  cleanup(resource) {
    resource.map.off('load', resource.onLoad)
    resource.map.off('style.load', resource.onStyleLoad)
    removeOwnedResources(resource.map)
  },
})

watch(() => props.data, (data) => {
  const source = geoJson.value?.map.getSource(props.sourceId)
  if (source?.type === 'geojson')
    (source as MapLibreGl.GeoJSONSource).setData(toRaw(data))
}, { deep: 2 })

watch(resourceSignature, (signature) => {
  if (geoJson.value && signature !== appliedSignature)
    trySyncResources(geoJson.value.map)
})

defineExpose({ geoJson })
</script>

<template>
  <!-- nuxt-scripts: MapLibre GeoJSON source and layers -->
</template>
