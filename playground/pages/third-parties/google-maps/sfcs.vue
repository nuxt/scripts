<script setup lang="ts">
import { whenever } from '@vueuse/core'
import { ref, useTemplateRef } from 'vue'

const isInfoWindowShown = ref(false)

const isMarkerShown = ref(false)

const markerOptions = ref({
  position: { lat: -33.8688, lng: 151.2093 },
})

const isAdvancedMarkerElementShown = ref(false)

const isAdvancedMarkerElementWithPinElementShown = ref(false)

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
      above-the-fold
      :map-options="{
        center: { lat: -34.397, lng: 150.644 },
        zoom: 8,
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
        :options="markerOptions"
      >
        <ScriptGoogleMapsInfoWindow>
          info window content
        </ScriptGoogleMapsInfoWindow>
      </ScriptGoogleMapsMarker>

      <ScriptGoogleMapsAdvancedMarkerElement
        v-if="isAdvancedMarkerElementShown"
        :options="{
          position: { lat: -33.8688, lng: 151.2093 },
        }"
      >
        <ScriptGoogleMapsInfoWindow>
          info window content
        </ScriptGoogleMapsInfoWindow>
      </ScriptGoogleMapsAdvancedMarkerElement>

      <ScriptGoogleMapsAdvancedMarkerElement
        v-if="isAdvancedMarkerElementWithPinElementShown"
        :options="{
          position: { lat: -33.8688, lng: 151.2093 },
        }"
      >
        <ScriptGoogleMapsPinElement
          :options="{
            scale: 1.5,
          }"
        />

        <ScriptGoogleMapsInfoWindow>
          info window content
        </ScriptGoogleMapsInfoWindow>
      </ScriptGoogleMapsAdvancedMarkerElement>

      <ScriptGoogleMapsMarkerClusterer v-if="isMarkerClustererShown">
        <ScriptGoogleMapsMarker
          v-for="marker in markers"
          :key="marker.position.lat + marker.position.lng"
          :options="{ position: marker.position }"
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
        @click="isAdvancedMarkerElementShown = !isAdvancedMarkerElementShown"
      >
        {{ `${isAdvancedMarkerElementShown ? 'Hide' : 'Show'} advanced marker element` }}
      </button>

      <button
        class="bg-[#ffa500] rounded-lg px-2 py-1"
        @click="isAdvancedMarkerElementWithPinElementShown = !isAdvancedMarkerElementWithPinElementShown"
      >
        {{ `${isAdvancedMarkerElementWithPinElementShown ? 'Hide' : 'Show'} advanced marker element with pin element` }}
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
        @click="isCircleShown = !isCircleShown"
      >
        {{ `${isCircleShown ? 'Hide' : 'Show'} circle` }}
      </button>
    </div>
  </div>
</template>
