<script setup>
import { ref } from 'vue'

const center = ref(null)

function changeQuery() {
  center.value = {
    lat: 35.681236,
    lng: 139.767125,
  }
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
        above-the-fold
        :center="center"
      />
    </div>
    <div class="button-container">
      <button
        class="button"
        @click="changeQuery"
      >
        set center
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
