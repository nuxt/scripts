<script setup lang="ts">
const mapOptions = {
  center: { lat: -34.397, lng: 150.644 },
  styles: [{ elementType: 'labels', stylers: [{ visibility: 'off' }, { color: '#f49f53' }] }, { featureType: 'landscape', stylers: [{ color: '#f9ddc5' }, { lightness: -7 }] }, { featureType: 'road', stylers: [{ color: '#813033' }, { lightness: 43 }] }, { featureType: 'poi.business', stylers: [{ color: '#645c20' }, { lightness: 38 }] }, { featureType: 'water', stylers: [{ color: '#1994bf' }, { saturation: -69 }, { gamma: 0.99 }, { lightness: 43 }] }, { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#f19f53' }, { weight: 1.3 }, { visibility: 'on' }, { lightness: 16 }] }, { featureType: 'poi.business' }, { featureType: 'poi.park', stylers: [{ color: '#645c20' }, { lightness: 39 }] }, { featureType: 'poi.school', stylers: [{ color: '#a95521' }, { lightness: 35 }] }, {}, { featureType: 'poi.medical', elementType: 'geometry.fill', stylers: [{ color: '#813033' }, { lightness: 38 }, { visibility: 'off' }] }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { elementType: 'labels' }, { featureType: 'poi.sports_complex', stylers: [{ color: '#9e5916' }, { lightness: 32 }] }, {}, { featureType: 'poi.government', stylers: [{ color: '#9e5916' }, { lightness: 46 }] }, { featureType: 'transit.station', stylers: [{ visibility: 'off' }] }, { featureType: 'transit.line', stylers: [{ color: '#813033' }, { lightness: 22 }] }, { featureType: 'transit', stylers: [{ lightness: 38 }] }, { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#f19f53' }, { lightness: -10 }] }, {}, {}, {}],
} satisfies google.maps.MapOptions
</script>

<template>
  <div>
    <div>
      <ScriptGoogleMaps
        api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU"
        :width="1200"
        :height="600"
        above-the-fold
        :map-options="mapOptions"
      />
    </div>
    <div class="button-container">
      <button
        class="button"
        @click="changeQuery"
      >
        change query
      </button>
    </div>
  </div>
</template>

<style>
.button-container {
  margin: 20px 0;
}

.button {
  background-color: orange;
  border-radius: 8px;
  padding: 4px 8px;
  cursor: pointer;
}

.button:not(:last-child) {
  margin-right: 8px;
}
</style>
