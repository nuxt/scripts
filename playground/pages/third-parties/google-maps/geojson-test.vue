<script setup lang="ts">
import { computed, ref } from 'vue'

const eventLog = ref<string[]>([])

function log(event: string, payload?: any) {
  const detail = payload?.feature?.getProperty?.('name') ?? ''
  const entry = `[${new Date().toLocaleTimeString()}] ${event}${detail ? ` — ${detail}` : ''}`
  eventLog.value.unshift(entry)
  if (eventLog.value.length > 80)
    eventLog.value.length = 80
  console.log(entry, payload)
}

// Inline GeoJSON object source
const inlineGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [151.18, -33.86],
          [151.22, -33.86],
          [151.22, -33.89],
          [151.18, -33.89],
          [151.18, -33.86],
        ]],
      },
      properties: { name: 'Inline Polygon' },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [151.20, -33.875],
      },
      properties: { name: 'Inline Point' },
    },
  ],
}

// URL source (earthquakes from USGS)
const urlGeoJson = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson'

// Toggle between inline and URL source
const useUrl = ref(false)
const currentSrc = computed(() => useUrl.value ? urlGeoJson : inlineGeoJson)

// Reactive style
const fillColor = ref('#4285F4')
const fillOpacity = ref(0.3)
const strokeWeight = ref(2)

const geoJsonStyle = computed(() => ({
  fillColor: fillColor.value,
  fillOpacity: fillOpacity.value,
  strokeColor: fillColor.value,
  strokeWeight: strokeWeight.value,
}))

// Second GeoJSON for mount/unmount test
const showSecondLayer = ref(false)
const secondGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [151.23, -33.87],
          [151.27, -33.87],
          [151.27, -33.90],
          [151.23, -33.90],
          [151.23, -33.87],
        ]],
      },
      properties: { name: 'Second Layer' },
    },
  ],
}
</script>

<template>
  <div style="display: flex; gap: 16px; padding: 16px; font-family: sans-serif;">
    <div style="flex: 1;">
      <h2 style="margin: 0 0 4px;">GeoJson Component Test</h2>
      <p style="margin: 0 0 12px; color: #666; font-size: 13px;">
        Tests: inline/URL source, reactive src swap, reactive style, mount/unmount, all events.
      </p>

      <ScriptGoogleMaps
        :width="800"
        :height="450"
        :map-options="{ center: { lat: -33.875, lng: 151.22 }, zoom: 13 }"
      >
        <!-- Primary GeoJSON layer -->
        <ScriptGoogleMapsGeoJson
          :src="currentSrc"
          :style="geoJsonStyle"
          @click="(p: any) => log('click', p)"
          @contextmenu="(p: any) => log('contextmenu', p)"
          @dblclick="(p: any) => log('dblclick', p)"
          @mousedown="(p: any) => log('mousedown', p)"
          @mousemove="(p: any) => log('mousemove', p)"
          @mouseout="(p: any) => log('mouseout', p)"
          @mouseover="(p: any) => log('mouseover', p)"
          @mouseup="(p: any) => log('mouseup', p)"
          @addfeature="(p: any) => log('addfeature', p)"
          @removefeature="(p: any) => log('removefeature', p)"
          @setgeometry="(p: any) => log('setgeometry', p)"
          @setproperty="(p: any) => log('setproperty', p)"
          @removeproperty="(p: any) => log('removeproperty', p)"
        />

        <!-- Second layer for mount/unmount testing -->
        <ScriptGoogleMapsGeoJson
          v-if="showSecondLayer"
          :src="secondGeoJson"
          :style="{ fillColor: '#ea4335', fillOpacity: 0.4, strokeColor: '#ea4335', strokeWeight: 2 }"
          @click="(p: any) => log('second:click', p)"
          @addfeature="(p: any) => log('second:addfeature', p)"
          @mouseover="(p: any) => log('second:mouseover', p)"
          @mouseout="(p: any) => log('second:mouseout', p)"
        />
      </ScriptGoogleMaps>

      <!-- Controls -->
      <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <button
          style="background: #1a73e8; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;"
          @click="useUrl = !useUrl"
        >
          Source: {{ useUrl ? 'URL (USGS earthquakes)' : 'Inline object' }}
        </button>

        <button
          style="background: #ea4335; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;"
          @click="showSecondLayer = !showSecondLayer"
        >
          {{ showSecondLayer ? 'Remove' : 'Add' }} second layer
        </button>

        <label style="font-size: 13px; display: flex; align-items: center; gap: 4px;">
          Fill:
          <input v-model="fillColor" type="color" style="width: 30px; height: 24px; border: none; cursor: pointer;">
        </label>

        <label style="font-size: 13px; display: flex; align-items: center; gap: 4px;">
          Opacity:
          <input v-model.number="fillOpacity" type="range" min="0" max="1" step="0.1" style="width: 80px;">
          {{ fillOpacity.toFixed(1) }}
        </label>

        <label style="font-size: 13px; display: flex; align-items: center; gap: 4px;">
          Stroke:
          <input v-model.number="strokeWeight" type="range" min="0" max="10" step="1" style="width: 80px;">
          {{ strokeWeight }}px
        </label>
      </div>

      <div style="margin-top: 8px; font-size: 12px; color: #888;">
        <strong>Test checklist:</strong>
        1) addfeature fires on load
        2) hover polygon → mouseover/mouseout
        3) click polygon → click
        4) right-click → contextmenu
        5) swap source → features clear and reload
        6) change color/opacity/stroke → style updates live
        7) add/remove second layer → clean mount/unmount
        8) zero Vue warnings in console
      </div>
    </div>

    <!-- Event log -->
    <div style="width: 320px; max-height: 600px; overflow-y: auto; background: #1a1a2e; color: #0f0; font-family: monospace; font-size: 11px; padding: 12px; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="color: #fff;">Event Log</strong>
        <button style="background: #333; color: #fff; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;" @click="eventLog = []">
          Clear
        </button>
      </div>
      <div v-if="!eventLog.length" style="color: #666;">
        Waiting for events...
      </div>
      <div v-for="(entry, i) in eventLog" :key="i" style="padding: 2px 0; border-bottom: 1px solid #333;">
        {{ entry }}
      </div>
    </div>
  </div>
</template>
