<script setup lang="ts">
import type { ScriptMapLibreGeoJsonLayer, ScriptMapLibreMapExpose } from '@nuxt/scripts'
import { useRoute } from 'nuxt/app'
import { computed, nextTick, reactive, shallowRef, unref, useTemplateRef, watch } from 'vue'

const style = blankStyle('#ffffff')

// Three groups of four points. At zoom 4 one degree is about 23 pixels, so the
// points in a group sit about 5 pixels apart and the groups sit 115 pixels apart.
const groups: Array<[number, number]> = [[-5, 0], [0, 0], [5, 0]]
const offsets: Array<[number, number]> = [[0, 0], [0.2, 0], [0, 0.2], [0.2, 0.2]]
const data = points(groups.flatMap(([lng, lat], group) => offsets.map(([dx, dy], index) => ({
  id: group * offsets.length + index + 1,
  name: `point-${group}-${index}`,
  kind: 'site',
  position: [lng + dx, lat + dy] as [number, number],
}))))

// `?data=missing` points the source at a URL that returns 404. The worker never
// builds a cluster index, so a later cluster update fails inside the worker.
const route = useRoute()
const sourceData = shallowRef<typeof data | string>(route.query.data === 'missing' ? '/missing-points.geojson' : data)

const layers: ScriptMapLibreGeoJsonLayer[] = [
  { id: 'clusters', type: 'circle', filter: ['has', 'point_count'], paint: { 'circle-radius': 12, 'circle-color': '#dc2626' } },
  { id: 'points', type: 'circle', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': 3, 'circle-color': '#2563eb' } },
]

const clusterRadius = shallowRef(1)
const clusterMinPoints = shallowRef(2)
const sourceOptions = computed(() => ({
  cluster: true,
  clusterRadius: clusterRadius.value,
  clusterMinPoints: clusterMinPoints.value,
}))

const log = reactive({ addSource: 0, removeSource: 0, errors: [] as string[] })

const mapComponent = useTemplateRef<ScriptMapLibreMapExpose>('mapComponent')

/**
 * Runs once the map instance exists. A source whose data fails to load can keep
 * MapLibre from firing `load`, so this page does not wait for `ready`.
 */
// A template ref unwraps the exposed refs, so `map` may already be the instance.
watch(() => unref(mapComponent.value?.map), (instance) => {
  if (!instance || (window as any).__ready)
    return
  // Count every source rebuild the component performs from here on.
  const addSource = instance.addSource.bind(instance)
  const removeSource = instance.removeSource.bind(instance)
  instance.addSource = (...args) => {
    log.addSource++
    return addSource(...args)
  }
  instance.removeSource = (...args) => {
    log.removeSource++
    return removeSource(...args)
  }
  exposeMap(instance)
  ;(window as any).__ready = true
})

/** Sends a second radius while MapLibre's worker still runs the first. */
async function burst(): Promise<void> {
  clusterRadius.value = 400
  await nextTick()
  clusterRadius.value = 50
}

/**
 * Queues a failing data load behind a radius update, then supersedes that
 * update with a second radius. All three land on the source while the first
 * radius update still runs in MapLibre's worker.
 */
async function burstData(): Promise<void> {
  clusterRadius.value = 400
  await nextTick()
  sourceData.value = '/missing-points.geojson'
  await nextTick()
  clusterRadius.value = 50
}
</script>

<template>
  <div>
    <ScriptMapLibreMap
      ref="mapComponent"
      trigger="immediate"
      :map-style="style"
      :center="[0, 0]"
      :zoom="4"
      :width="400"
      :height="300"
    >
      <ScriptMapLibreGeoJson
        source-id="places"
        :data="sourceData"
        :layers="layers"
        :source-options="sourceOptions"
        @error="error => log.errors.push(error.message)"
      />
    </ScriptMapLibreMap>
    <button id="radius-merge" type="button" @click="clusterRadius = 50">
      Merge each group
    </button>
    <button id="radius-split" type="button" @click="clusterRadius = 1">
      Split every group
    </button>
    <button id="radius-burst" type="button" @click="burst">
      Change the radius twice
    </button>
    <button id="burst-data" type="button" @click="burstData">
      Radius, broken data, radius
    </button>
    <button id="min-points" type="button" @click="clusterMinPoints = 5">
      Require five points per cluster
    </button>
    <pre id="log">{{ JSON.stringify(log) }}</pre>
  </div>
</template>
