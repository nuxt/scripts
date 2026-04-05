<script setup>
import { ref } from 'vue'
import { ScriptGoogleMaps } from '#components'

const mapOptions = ref({
  center: { lat: -34.397, lng: 150.644 },
})

const googleMapsRef = useTemplateRef('googleMapsRef')

async function changeQuery() {
    const res = await googleMapsRef.value.resolveQueryToLatLng('Brooklyn+Bridge,New+York+NY')

  mapOptions.value.center = res
}
</script>

<template>
  <div>
    <div>
      <ScriptGoogleMaps
        ref="googleMapsRef"
        :width="640"
        :height="500"
        :map-options="mapOptions"
      >
        <template #placeholder>
          <ScriptGoogleMapsStaticMap
            :center="mapOptions.center"
            :width="640"
            :height="500"
            loading="eager"
          />
        </template>
      </ScriptGoogleMaps>
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
