<script setup lang="ts">
import { ref } from 'vue'

const isLoaded = ref(false)
const maps = ref()

const query = ref('Space+Needle,Seattle+WA')
</script>

<template>
  <div class="not-prose">
    <div class="flex items-center justify-center p-5">
      <ScriptGoogleMaps ref="maps" :query="query" api-key="AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU" width="600" height="400" video-id="d_IFKP1Ofq0" class="group" @ready="isLoaded = true" />
    </div>
    <div class="text-center">
      <UAlert v-if="!isLoaded" class="mb-5" size="sm" color="blue" variant="soft" title="Hover to load" description="Hover the map will load the Google Maps iframe." />
    </div>
  </div>
</template>
