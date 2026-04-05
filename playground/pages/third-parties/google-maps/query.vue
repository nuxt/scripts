<script setup lang="ts">
import type { ScriptGoogleMapsProps } from '#nuxt-scripts/components/GoogleMaps/ScriptGoogleMaps.vue'
import { ref } from 'vue'

const googleMapsRef = useTemplateRef('googleMapsRef')

const query = ref('Brooklyn+Bride,New+York+NY')

const center = ref<google.maps.LatLng | google.maps.LatLngLiteral>({ lat: -34.397, lng: 150.644 })

async function changeQuery() {
    if (!googleMapsRef.value) {
        return
    }

    query.value = query.value.startsWith('Statue')
        ? 'Brooklyn+Bride,New+York+NY'
        : 'Statue+of+Liberty+National+Monument+New+York+NY'

    const queryLatLng = await googleMapsRef.value.resolveQueryToLatLng(
        query.value
    )

    if (queryLatLng) {
        center.value = queryLatLng
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
        :map-options="{
            center
        }"
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
