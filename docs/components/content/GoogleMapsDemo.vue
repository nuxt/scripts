<script setup lang="ts">
import { ref } from 'vue'

const isLoaded = ref(false)
const center = ref()
const maps = ref()

const query = ref({
  lat:  -37.7995487,
  lng: 144.9867841,
})

const markers = ref([])

let increment = 1
function addMarker() {
  // push to markers, we want to add a marker from the center but randomize the position by a bit
  const _center = center.value || query.value
  // lat and lng may be a function
  const _lat = typeof _center.lat === 'function' ? _center.lat() : _center.lat
  const _lng = typeof _center.lng === 'function' ? _center.lng() : _center.lng
  const lat = (1000 * _lat + increment) / 1000
  const lng = (1000 * _lng + increment) / 1000
  increment += 1

  markers.value.push(`${lat},${lng}`)
}

function removeMarkers() {
  markers.value = []
  increment = 0
}
function handleReady({ map }) {
  center.value = map.value.getCenter()
  map.value.addListener('center_changed', () => {
    center.value = map.value.getCenter()
  })
  isLoaded.value = true
}
</script>

<template>
  <div class="not-prose">
    <div class="flex items-center justify-center p-5">
      <ScriptGoogleMaps
        ref="maps"
        :center="query"
        :markers="markers"
        api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU"
        class="group"
        above-the-fold
        @ready="handleReady"
      />
    </div>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Static Image: Hover to load interactive" description="Hovering the map will trigger the Google Maps script to load and init the map." />
      <UAlert v-if="isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Interactive Map">
        <template #description>
          Center: {{ center }}
        </template>
      </UAlert>
      <UButton @click="addMarker" type="button" class="">
        Add Marker
      </UButton>
      <UButton v-if="markers.length" @click="removeMarkers" type="button" color="gray" variant="ghost" class="">
        Remove Markers
      </UButton>
    </div>
  </div>
</template>
