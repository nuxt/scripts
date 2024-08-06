<script setup>
import { ref, onMounted } from 'vue'

const mapOptions = ref({
  center: { lat: -34.397, lng: 150.644 },
})

const googleMapsRef = ref()

onMounted(() => {
  if (googleMapsRef.value) {
    console.log(googleMapsRef.value)
  }
})

function setupGoogleMaps(api) {

}
function changeQuery() {
  query.value = 'Brooklyn+Bride,New+York+NY'
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
