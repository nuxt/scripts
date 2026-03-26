<script setup lang="ts">
import { whenever } from '@vueuse/core'
import { ref, useTemplateRef } from 'vue'

const isInfoWindowShown = ref(false)

const isMarkerShown = ref(false)

const isMarkerWithCustomContentShown = ref(false)

const isMarkerClustererShown = ref(false)

const markers = [
  { position: { lat: -33.8688, lng: 151.2093 } },
  { position: { lat: -33.8690, lng: 151.2100 } },
  { position: { lat: -33.8700, lng: 151.2150 } },
  { position: { lat: -33.8710, lng: 151.2200 } },
  { position: { lat: -33.8720, lng: 151.2250 } },
]

const isRectangleShown = ref(false)

const isPolylineShown = ref(false)

const isPolygonShown = ref(false)

const isHeatmapLayerShown = ref(false)

const heatmapLayerData = ref<google.maps.LatLng[]>([])

const isCircleShown = ref(false)

const isGeoJsonShown = ref(false)

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

const isOverlayViewShown = ref(false)

const isOverlayViewOnMarkerShown = ref(false)

const isCustomMarkerContentShown = ref(false)

const isOverlayPopupShown = ref(false)
const overlayPopupOpen = ref(false)

const zoom = ref(8)

const googleMapsRef = useTemplateRef('googleMapsRef')

whenever(() => googleMapsRef.value?.googleMaps, (googleMaps) => {
  heatmapLayerData.value.push(...[
    new googleMaps.LatLng(-33.8688, 151.2093),
    new googleMaps.LatLng(-33.8690, 151.2100),
    new googleMaps.LatLng(-33.8700, 151.2150),
    new googleMaps.LatLng(-33.8710, 151.2200),
    new googleMaps.LatLng(-33.8720, 151.2250),
    new googleMaps.LatLng(-33.8730, 151.2300),
    new googleMaps.LatLng(-33.8740, 151.2350),
    new googleMaps.LatLng(-33.8750, 151.2400),
    new googleMaps.LatLng(-33.8760, 151.2450),
    new googleMaps.LatLng(-33.8770, 151.2500),
    new googleMaps.LatLng(-33.8780, 151.2550),
    new googleMaps.LatLng(-33.8790, 151.2600),
    new googleMaps.LatLng(-33.8800, 151.2650),
    new googleMaps.LatLng(-33.8810, 151.2700),
  ])
})
</script>

<template>
  <div>
    <ScriptGoogleMaps
      ref="googleMapsRef"
      api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU"
      :width="1280"
      :height="720"
      :zoom="zoom"
      :map-options="{
        center: { lat: -34.397, lng: 150.644 },
        mapId: 'DEMO_MAP_ID',
      }"
    >
      <ScriptGoogleMapsInfoWindow
        v-if="isInfoWindowShown"
        :options="{ position: { lat: -33.8688, lng: 151.2093 } }"
      >
        <div>
          info window content
        </div>
      </ScriptGoogleMapsInfoWindow>

      <ScriptGoogleMapsMarker
        v-if="isMarkerShown"
        :position="{ lat: -33.8688, lng: 151.2093 }"
      >
        <ScriptGoogleMapsInfoWindow>
          info window content
        </ScriptGoogleMapsInfoWindow>
      </ScriptGoogleMapsMarker>

      <ScriptGoogleMapsMarker
        v-if="isMarkerWithCustomContentShown"
        :position="{ lat: -33.8688, lng: 151.2093 }"
      >
        <template #content>
          <div style="background: #34a853; color: white; padding: 4px 10px; border-radius: 16px; font-family: sans-serif; font-size: 12px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer;">
            Custom Pin
          </div>
        </template>

        <ScriptGoogleMapsInfoWindow>
          info window content
        </ScriptGoogleMapsInfoWindow>
      </ScriptGoogleMapsMarker>

      <ScriptGoogleMapsMarkerClusterer v-if="isMarkerClustererShown">
        <ScriptGoogleMapsMarker
          v-for="marker in markers"
          :key="marker.position.lat + marker.position.lng"
          :position="marker.position"
        >
          <ScriptGoogleMapsInfoWindow>
            info window content
          </ScriptGoogleMapsInfoWindow>
        </ScriptGoogleMapsMarker>
      </ScriptGoogleMapsMarkerClusterer>

      <ScriptGoogleMapsRectangle
        v-if="isRectangleShown"
        :options="{
          bounds: {
            north: -33.85,
            south: -33.90,
            east: 151.25,
            west: 151.20,
          },
          editable: true,
          draggable: true,
        }"
      />

      <ScriptGoogleMapsPolyline
        v-if="isPolylineShown"
        :options="{
          path: [
            { lat: -33.8688, lng: 151.2093 },
            { lat: -33.8700, lng: 151.2200 },
            { lat: -33.8750, lng: 151.2300 },
            { lat: -33.8800, lng: 151.2400 },
            { lat: -33.8850, lng: 151.2500 },
          ],
          geodesic: true,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 2,
        }"
      />

      <ScriptGoogleMapsPolygon
        v-if="isPolygonShown"
        :options="{
          paths: [
            { lat: -33.8688, lng: 151.2093 },
            { lat: -33.8700, lng: 151.2200 },
            { lat: -33.8750, lng: 151.2300 },
            { lat: -33.8800, lng: 151.2400 },
            { lat: -33.8850, lng: 151.2500 },
            { lat: -33.8900, lng: 151.2600 },
            { lat: -33.8950, lng: 151.2700 },
            { lat: -33.9000, lng: 151.2800 },
            { lat: -33.9050, lng: 151.2900 },
            { lat: -33.9100, lng: 151.3000 },
          ],
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.35,
        }"
      />

      <ScriptGoogleMapsHeatmapLayer
        v-if="isHeatmapLayerShown"
        :options="{
          data: heatmapLayerData,
        }"
      />

      <ScriptGoogleMapsGeoJson
        v-if="isGeoJsonShown"
        :src="geoJsonData"
        :style="{
          fillColor: '#4285F4',
          fillOpacity: 0.3,
          strokeColor: '#4285F4',
          strokeWeight: 2,
        }"
      />

      <ScriptGoogleMapsOverlayView
        v-if="isOverlayViewShown"
        :position="{ lat: -33.8688, lng: 151.2093 }"
        anchor="bottom-center"
        :offset="{ x: 0, y: -10 }"
      >
        <div style="background: white; padding: 8px 12px; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-family: sans-serif;">
          <strong>Custom Overlay</strong>
          <p style="margin: 4px 0 0;">Vue slot content with full reactivity</p>
        </div>
      </ScriptGoogleMapsOverlayView>

      <ScriptGoogleMapsMarker
        v-if="isOverlayViewOnMarkerShown"
        :position="{ lat: -34.0, lng: 150.8 }"
        :options="{ gmpDraggable: true }"
      >
        <ScriptGoogleMapsOverlayView
          anchor="bottom-center"
          :offset="{ x: 0, y: -50 }"
        >
          <div style="background: #1a73e8; color: white; padding: 6px 12px; border-radius: 20px; font-family: sans-serif; font-size: 13px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
            Drag me! Custom overlay on Marker
          </div>
        </ScriptGoogleMapsOverlayView>
      </ScriptGoogleMapsMarker>

      <!-- Custom marker content via #content slot -->
      <ScriptGoogleMapsMarker
        v-if="isCustomMarkerContentShown"
        :position="{ lat: -34.5, lng: 150.7 }"
      >
        <template #content>
          <div style="background: #34a853; color: white; padding: 4px 10px; border-radius: 16px; font-family: sans-serif; font-size: 12px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer;">
            $420k
          </div>
        </template>
      </ScriptGoogleMapsMarker>

      <!-- OverlayView with v-model:open (click marker to toggle popup) -->
      <ScriptGoogleMapsMarker
        v-if="isOverlayPopupShown"
        :position="{ lat: -34.3, lng: 151.0 }"
        @click="overlayPopupOpen = !overlayPopupOpen"
      >
        <ScriptGoogleMapsOverlayView
          v-model:open="overlayPopupOpen"
          anchor="bottom-center"
          :offset="{ x: 0, y: -50 }"
        >
          <div style="background: white; padding: 12px 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-family: sans-serif; font-size: 13px; min-width: 150px;">
            <strong>Custom Popup</strong>
            <p style="margin: 4px 0 0; color: #666;">v-model:open, no remount</p>
            <button style="margin-top: 8px; background: #ea4335; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;" @click.stop="overlayPopupOpen = false">
              Close
            </button>
          </div>
        </ScriptGoogleMapsOverlayView>
      </ScriptGoogleMapsMarker>

      <ScriptGoogleMapsCircle
        v-if="isCircleShown"
        :options="{
          center: { lat: -33.8688, lng: 151.2093 },
          radius: 1000,
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.35,
        }"
      />
    </ScriptGoogleMaps>

    <div class="my-5 flex gap-5 flex-wrap">
      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isInfoWindowShown = !isInfoWindowShown"
      >
        {{ `${isInfoWindowShown ? 'Hide' : 'Show'} info window` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isMarkerShown = !isMarkerShown"
      >
        {{ `${isMarkerShown ? 'Hide' : 'Show'} marker` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isMarkerWithCustomContentShown = !isMarkerWithCustomContentShown"
      >
        {{ `${isMarkerWithCustomContentShown ? 'Hide' : 'Show'} marker with custom content` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isMarkerClustererShown = !isMarkerClustererShown"
      >
        {{ `${isMarkerClustererShown ? 'Hide' : 'Show'} marker clusterer` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isRectangleShown = !isRectangleShown"
      >
        {{ `${isRectangleShown ? 'Hide' : 'Show'} rectangle` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isPolylineShown = !isPolylineShown"
      >
        {{ `${isPolylineShown ? 'Hide' : 'Show'} polyline` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isPolygonShown = !isPolygonShown"
      >
        {{ `${isPolygonShown ? 'Hide' : 'Show'} polygon` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isHeatmapLayerShown = !isHeatmapLayerShown"
      >
        {{ `${isHeatmapLayerShown ? 'Hide' : 'Show'} heatmap layer` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isGeoJsonShown = !isGeoJsonShown"
      >
        {{ `${isGeoJsonShown ? 'Hide' : 'Show'} geojson` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isOverlayViewShown = !isOverlayViewShown"
      >
        {{ `${isOverlayViewShown ? 'Hide' : 'Show'} overlay view` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isOverlayViewOnMarkerShown = !isOverlayViewOnMarkerShown"
      >
        {{ `${isOverlayViewOnMarkerShown ? 'Hide' : 'Show'} overlay on marker` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isCustomMarkerContentShown = !isCustomMarkerContentShown"
      >
        {{ `${isCustomMarkerContentShown ? 'Hide' : 'Show'} custom marker content` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isOverlayPopupShown = !isOverlayPopupShown"
      >
        {{ `${isOverlayPopupShown ? 'Hide' : 'Show'} overlay popup (v-model:open)` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isCircleShown = !isCircleShown"
      >
        {{ `${isCircleShown ? 'Hide' : 'Show'} circle` }}
      </button>

      <div class="flex items-center gap-2">
        <label>Zoom: {{ zoom }}</label>
        <input
          v-model.number="zoom"
          type="range"
          min="1"
          max="20"
          class="w-32"
        >
      </div>
    </div>
  </div>
</template>
