<script setup lang="ts">
import type { LngLatLike } from 'maplibre-gl'
import { ref } from 'vue'

const center = ref<LngLatLike>([147.3272, -42.8821])
const showScale = ref(true)
const showGeolocate = ref(true)
const showFullscreen = ref(true)
const showAttribution = ref(true)
const unit = ref<'metric' | 'imperial' | 'nautical'>('metric')
const events = ref<string[]>([])

function log(message: string) {
  events.value = [message, ...events.value].slice(0, 8)
}
</script>

<template>
  <article class="controls-demo">
    <h1>MapLibre controls</h1>

    <fieldset>
      <legend>Mounted controls</legend>
      <label><input v-model="showScale" type="checkbox" name="scale"> Scale (bottom-left)</label>
      <label><input v-model="showGeolocate" type="checkbox" name="geolocate"> Geolocate (top-left)</label>
      <label><input v-model="showFullscreen" type="checkbox" name="fullscreen"> Fullscreen (top-right)</label>
      <label><input v-model="showAttribution" type="checkbox" name="attribution"> Attribution (bottom-left)</label>
      <label>
        Scale unit
        <select v-model="unit" name="unit">
          <option value="metric">metric</option>
          <option value="imperial">imperial</option>
          <option value="nautical">nautical</option>
        </select>
      </label>
    </fieldset>

    <ScriptMapLibreMap
      v-model:center="center"
      map-style="https://tiles.openfreemap.org/styles/liberty"
      :zoom="12"
      width="100%"
      :height="480"
      aria-label="Map of Hobart"
    >
      <ScriptMapLibreScaleControl v-if="showScale" position="bottom-left" :options="{ unit, maxWidth: 120 }" />
      <ScriptMapLibreGeolocateControl
        v-if="showGeolocate"
        position="top-left"
        @geolocate="log('geolocate')"
        @error="event => log(`error code ${event.code}: ${event.message}`)"
        @unavailable="reason => log(`unavailable: ${reason}`)"
      />
      <ScriptMapLibreFullscreenControl
        v-if="showFullscreen"
        position="top-right"
        @fullscreenstart="log('fullscreenstart')"
        @fullscreenend="log('fullscreenend')"
      />
      <ScriptMapLibreAttributionControl v-if="showAttribution" position="bottom-left" :options="{ compact: false }" />
    </ScriptMapLibreMap>

    <ol class="event-log" aria-live="polite">
      <li v-for="(event, index) in events" :key="index">
        {{ event }}
      </li>
    </ol>
  </article>
</template>

<style scoped>
.controls-demo {
  display: grid;
  gap: 1rem;
  width: min(60rem, 100%);
  margin-block: 2rem;
}

fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
