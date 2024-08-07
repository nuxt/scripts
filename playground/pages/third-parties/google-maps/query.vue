<script setup lang="ts">
import { ref } from 'vue'

const center = ref<string>('Brooklyn+Bride,New+York+NY')

function changeQuery() {
  if (center.value.startsWith('Statue')) {
    center.value = 'Brooklyn+Bride,New+York+NY'
  }
  else {
    center.value = 'Statue+of+Liberty+National+Monument+New+York+NY'
  }
}
</script>

<template>
  <div>
    <div>
      <ScriptGoogleMaps
        api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU"
        :width="1200"
        :height="600"
        :center="center"
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
