<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'

const isLoaded = ref(false)
const center = ref()
const maps = ref()

const query = ref('Space+Needle,Seattle+WA')
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
        api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU"
        class="group"
        above-the-fold
        @ready="handleReady"
      />
    </div>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Hover to load" description="Hover the map will load the Google Maps iframe." />
      <UAlert v-if="isLoaded" class="mb-5" size="sm" color="blue" variant="soft">
        <template #title>
          Center: {{ center }}
        </template>
      </UAlert>
    </div>
  </div>
</template>
