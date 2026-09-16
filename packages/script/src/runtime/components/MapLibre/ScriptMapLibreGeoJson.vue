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
let isPointerOverLayer = false

/**
 * True while the style accepts `addSource` and `addLayer`. MapLibre allows both
 * from `style.load` onwards. `isStyleLoaded()` is a stricter signal: it also
 * waits for every tile and the sprite, so it is still false at `style.load`.
 */
let isStyleMutable = false
/** A sync was skipped because the style was mid-swap. The next ready signal runs it. */
let hasPendingSync = false

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
  isPointerOverLayer = false
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
      isPointerOverLayer = true
      applyCursor(map, props.cursor || undefined)
      emit('mouseenter', event)
    }),
    map.on('mouseleave', layerIds, (event) => {
      isPointerOverLayer = false
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
  if (!isStyleMutable && map.isStyleLoaded() !== true) {
    // The style is mid-swap and rejects new sources. Clear the signature, or a
    // later flip back to the last applied value would skip the rebuild.
    appliedSignature = undefined
    hasPendingSync = true
    return
  }

  hasPendingSync = false
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
    isStyleMutable = map.isStyleLoaded() === true
    // MapLibre drops every source and layer when a style loads, so the component
    // re-adds its own. `style.load` is the first moment the new style accepts them.
    const onStyleLoad = () => {
      isStyleMutable = true
      trySyncResources(map)
    }
    const onLoad = () => {
      isStyleMutable = true
      if (!ownedSourceId)
        trySyncResources(map)
    }
    // A full style reload starts here. The new style rejects new sources until
    // `style.load` fires.
    const onStyleDataLoading = () => {
      isStyleMutable = false
      hasPendingSync = true
    }
    // The map only goes idle once the style reports loaded, so this is the last
    // safety net for a sync that arrived while the style was busy.
    const onIdle = () => {
      isStyleMutable = true
      if (hasPendingSync)
        trySyncResources(map)
    }
    map.on('style.load', onStyleLoad)
    map.on('load', onLoad)
    map.on('styledataloading', onStyleDataLoading)
    map.on('idle', onIdle)
    // A failed first sync must not discard the resource. The style and prop
    // listeners stay registered, so a corrected layer rebuilds without a remount.
    trySyncResources(map)
    return { map, onLoad, onStyleLoad, onStyleDataLoading, onIdle }
  },
  onError: error => emit('error', error),
  cleanup(resource) {
    resource.map.off('load', resource.onLoad)
    resource.map.off('style.load', resource.onStyleLoad)
    resource.map.off('styledataloading', resource.onStyleDataLoading)
    resource.map.off('idle', resource.onIdle)
    removeOwnedResources(resource.map)
  },
})

watch(() => props.data, (data) => {
  const source = geoJson.value?.map.getSource(props.sourceId)
  if (source?.type === 'geojson')
    (source as MapLibreGl.GeoJSONSource).setData(toRaw(data))
}, { deep: 2 })

// The cursor is a presentation prop, so it stays out of the resource signature.
// Applying it here keeps it reactive without rebuilding the source and layers.
watch(() => props.cursor, (cursor) => {
  if (isPointerOverLayer && geoJson.value)
    applyCursor(geoJson.value.map, cursor || undefined)
})

watch(resourceSignature, (signature) => {
  if (geoJson.value && signature !== appliedSignature)
    trySyncResources(geoJson.value.map)
})

defineExpose({ geoJson })
</script>

<template>
  <!-- nuxt-scripts: MapLibre GeoJSON source and layers -->
</template>
