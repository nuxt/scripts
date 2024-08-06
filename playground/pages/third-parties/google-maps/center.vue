<script setup>
import { ref } from 'vue'

const mapOptions = ref({
  center: { lat: -34.397, lng: 150.644 },
})
function changeQuery() {
  mapOptions.value = {
    center: {
      // move just a little
      lat: mapOptions.value.center.lat + 0.01,
      lng: mapOptions.value.center.lng + 0.01,
    },
  }
}
</script>

<template>
  <div>
    <div>
      <ScriptGoogleMaps
        @init="setupGoogleMaps"
        ref="googleMapsRef"
        api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU"
        :width="1200"
        :height="600"
        :map-options="mapOptions"
        above-the-fold
      />
    </div>
    <div class="button-container">
      <button
        class="button"
        @click="changeQuery"
      >
        move center
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
