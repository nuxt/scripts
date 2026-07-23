<script lang="ts">
import type * as MapLibre from 'maplibre-gl'

export type ScriptMapLibreGeoJsonLayer = Omit<MapLibre.LayerSpecification, 'source'> & {
  /** Override the component's source ID for this layer. */
  source?: string
}

export interface ScriptMapLibreGeoJsonResource {
  map: MapLibre.Map
  onStyleLoad: () => void
}
</script>

<script setup lang="ts">
import type { GeoJSON } from 'geojson'
import type * as MapLibreGl from 'maplibre-gl'
import { toRaw, watch } from 'vue'
import { useMapLibreResource } from './useMapLibreResource'

const props = defineProps<{
  /** MapLibre source ID. Changing it rebuilds the owned source and layers. */
  sourceId: string
  /** Inline GeoJSON data or a URL returning GeoJSON. */
  data: GeoJSON | string
  /** GeoJSON source options. `type` and `data` are supplied by the component. */
  sourceOptions?: Omit<MapLibreGl.GeoJSONSourceSpecification, 'type' | 'data'>
  /** Style layers backed by this source. */
  layers: ScriptMapLibreGeoJsonLayer[]
  /** Existing layer ID before which the layers are inserted. */
  beforeId?: string
}>()

let ownedLayerIds: string[] = []
let ownedSourceId: string | undefined

function removeOwnedResources(map: MapLibreGl.Map): void {
  for (const layerId of [...ownedLayerIds].reverse()) {
    if (map.getLayer(layerId))
      map.removeLayer(layerId)
  }
  ownedLayerIds = []
  if (ownedSourceId && map.getSource(ownedSourceId))
    map.removeSource(ownedSourceId)
  ownedSourceId = undefined
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
  }
  catch (error) {
    removeOwnedResources(map)
    throw error
  }
}

const geoJson = useMapLibreResource<ScriptMapLibreGeoJsonResource>({
  create({ map }) {
    const onStyleLoad = () => syncResources(map)
    map.on('style.load', onStyleLoad)
    syncResources(map)
    return { map, onStyleLoad }
  },
  cleanup(resource) {
    resource.map.off('style.load', resource.onStyleLoad)
    removeOwnedResources(resource.map)
  },
})

watch(() => props.data, (data) => {
  const source = geoJson.value?.map.getSource(props.sourceId)
  if (source?.type === 'geojson')
    (source as MapLibreGl.GeoJSONSource).setData(toRaw(data))
}, { deep: 2 })

watch(() => [props.sourceId, props.layers, props.sourceOptions, props.beforeId] as const, () => {
  if (geoJson.value)
    syncResources(geoJson.value.map)
}, { deep: 3 })

defineExpose({ geoJson })
</script>

<template>
  <!-- nuxt-scripts: MapLibre GeoJSON source and layers -->
</template>
