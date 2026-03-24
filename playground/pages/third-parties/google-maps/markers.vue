<script setup>
import { ref } from 'vue'

const center = ref({ lat: -34.397, lng: 150.644 })

const markers = ref([
  { lat: -34.397, lng: 150.642 },
])

const googleMapsRef = ref()

let increment = 1
function addMarker() {
  const lat = (1000 * center.value.lat + increment) / 1000
  const lng = (1000 * center.value.lng + increment) / 1000
  increment += 1

  markers.value.push({ lat, lng })
}

function removeMarkers() {
  markers.value = []
}
</script>

<template>
  <div>
    <div>
      <ScriptGoogleMaps
        ref="googleMapsRef"
        api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU"
        :width="1200"
        :height="600"
        :map-options="{ center }"
        above-the-fold
      >
        <ScriptGoogleMapsMarker
          v-for="(marker, i) in markers"
          :key="`${marker.lat},${marker.lng}`"
          :position="marker"
        />
      </ScriptGoogleMaps>
    </div>
    <div>
      {{ markers }}
    </div>
    <div class="button-container">
      <button
        class="button"
        @click="addMarker"
      >
        add marker
      </button>
      <button
        class="button"
        @click="removeMarkers"
      >
        remove markers
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
