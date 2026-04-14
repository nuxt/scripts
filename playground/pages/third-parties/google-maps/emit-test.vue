<script setup lang="ts">
import { whenever } from '@vueuse/core'
import { ref, useTemplateRef } from 'vue'

const eventLog = ref<string[]>([])

function log(component: string, event: string, payload?: any) {
  const entry = `[${new Date().toLocaleTimeString()}] ${component} → ${event}`
  eventLog.value.unshift(entry)
  if (eventLog.value.length > 50)
    eventLog.value.length = 50
  // also log to console so we can check for Vue warnings side-by-side
  console.log(entry, payload)
}

const markers = [
  { position: { lat: -33.8688, lng: 151.2093 } },
  { position: { lat: -33.8690, lng: 151.2100 } },
  { position: { lat: -33.8700, lng: 151.2150 } },
  { position: { lat: -33.8710, lng: 151.2200 } },
  { position: { lat: -33.8720, lng: 151.2250 } },
]

const geoJsonData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [151.20, -33.87],
          [151.25, -33.87],
          [151.25, -33.90],
          [151.20, -33.90],
          [151.20, -33.87],
        ]],
      },
      properties: { name: 'Sydney CBD' },
    },
  ],
}

const circleOptions = {
  center: { lat: -33.88, lng: 151.18 },
  radius: 2000,
  strokeColor: '#34a853',
  fillColor: '#34a853',
  fillOpacity: 0.2,
}
</script>

<template>
  <div style="display: flex; gap: 16px; padding: 16px; font-family: sans-serif;">
    <div style="flex: 1;">
      <h2 style="margin: 0 0 8px;">Google Maps Emit Test</h2>
      <p style="margin: 0 0 12px; color: #666; font-size: 13px;">
        Open devtools console. No "[Vue warn]: Component emitted event" warnings should appear.
      </p>

      <ScriptGoogleMaps
        api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU"
        :width="800"
        :height="500"
        :zoom="12"
        :map-options="{
          center: { lat: -33.87, lng: 151.21 },
          mapId: 'DEMO_MAP_ID',
        }"
      >
        <!-- MarkerClusterer: should emit clusteringbegin/clusteringend on load -->
        <ScriptGoogleMapsMarkerClusterer
          @click="(p: any) => log('MarkerClusterer', 'click', p)"
          @clusteringbegin="(p: any) => log('MarkerClusterer', 'clusteringbegin', p)"
          @clusteringend="(p: any) => log('MarkerClusterer', 'clusteringend', p)"
        >
          <ScriptGoogleMapsMarker
            v-for="m in markers"
            :key="`${m.position.lat},${m.position.lng}`"
            :position="m.position"
            @click="(p: any) => log('Marker', 'click', p)"
            @drag="(p: any) => log('Marker', 'drag', p)"
          />
        </ScriptGoogleMapsMarkerClusterer>

        <!-- GeoJson: should emit addfeature on load, mouse events on hover/click -->
        <ScriptGoogleMapsGeoJson
          :src="geoJsonData"
          :style="{ fillColor: '#4285F4', fillOpacity: 0.3, strokeColor: '#4285F4', strokeWeight: 2 }"
          @click="(p: any) => log('GeoJson', 'click', p)"
          @mouseover="(p: any) => log('GeoJson', 'mouseover', p)"
          @mouseout="(p: any) => log('GeoJson', 'mouseout', p)"
          @addfeature="(p: any) => log('GeoJson', 'addfeature', p)"
        />

        <!-- Circle: should emit mouse events on hover/click -->
        <ScriptGoogleMapsCircle
          :options="circleOptions"
          @click="(p: any) => log('Circle', 'click', p)"
          @mouseover="(p: any) => log('Circle', 'mouseover', p)"
          @mouseout="(p: any) => log('Circle', 'mouseout', p)"
          @center_changed="() => log('Circle', 'center_changed')"
        />

        <!-- Rectangle: mouse events -->
        <ScriptGoogleMapsRectangle
          :options="{
            bounds: { north: -33.85, south: -33.88, east: 151.25, west: 151.22 },
            fillColor: '#ea4335',
            fillOpacity: 0.2,
            strokeColor: '#ea4335',
          }"
          @click="(p: any) => log('Rectangle', 'click', p)"
          @mouseover="(p: any) => log('Rectangle', 'mouseover', p)"
          @bounds_changed="() => log('Rectangle', 'bounds_changed')"
        />

        <!-- InfoWindow: should emit domready, visible -->
        <ScriptGoogleMapsInfoWindow
          :options="{ position: { lat: -33.86, lng: 151.19 } }"
          @domready="() => log('InfoWindow', 'domready')"
          @close="() => log('InfoWindow', 'close')"
          @visible="() => log('InfoWindow', 'visible')"
        >
          <div style="padding: 4px;">Test InfoWindow</div>
        </ScriptGoogleMapsInfoWindow>
      </ScriptGoogleMaps>
    </div>

    <!-- Event log panel -->
    <div style="width: 350px; max-height: 600px; overflow-y: auto; background: #1a1a2e; color: #0f0; font-family: monospace; font-size: 12px; padding: 12px; border-radius: 8px;">
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
