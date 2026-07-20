<script setup lang="ts">
import type { Feature, Polygon } from 'geojson'
import { ref } from 'vue'

const center = ref<[number, number]>([144.9631, -37.8136])
const zoom = ref(12)
const bearing = ref(0)
const pitch = ref(0)

const melbourneBoundary: Feature<Polygon> = {
  type: 'Feature',
  properties: { name: 'Melbourne CBD' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [144.949, -37.807],
      [144.978, -37.807],
      [144.978, -37.823],
      [144.949, -37.823],
      [144.949, -37.807],
    ]],
  },
}

const boundaryLayers = [
  {
    id: 'melbourne-boundary-fill',
    type: 'fill' as const,
    paint: {
      'fill-color': '#396cb2',
      'fill-opacity': 0.18,
    },
  },
  {
    id: 'melbourne-boundary-line',
    type: 'line' as const,
    paint: {
      'line-color': '#244773',
      'line-width': 2,
    },
  },
]

function showBotanicGardens() {
  center.value = [144.9796, -37.8304]
  zoom.value = 14
  bearing.value = 18
  pitch.value = 35
}

function resetCamera() {
  center.value = [144.9631, -37.8136]
  zoom.value = 12
  bearing.value = 0
  pitch.value = 0
}
</script>

<template>
  <main class="maplibre-demo">
    <header>
      <p class="eyebrow">
        Nuxt Scripts × MapLibre
      </p>
      <h1>Open vector maps, loaded on demand</h1>
      <p>
        MapLibre renders a provider-agnostic vector style with a reactive camera, accessible markers, and declarative GeoJSON.
      </p>
    </header>

    <ScriptMapLibreMap
      v-model:center="center"
      v-model:zoom="zoom"
      v-model:bearing="bearing"
      v-model:pitch="pitch"
      map-style="https://demotiles.maplibre.org/style.json"
      width="100%"
      :height="560"
      aria-label="Interactive map of central Melbourne"
    >
      <template #description>
        A street map centred on Melbourne. It marks the central business district and outlines its approximate boundary.
      </template>

      <template #placeholder>
        <div class="map-placeholder">
          Vector map loads near the viewport
        </div>
      </template>

      <ScriptMapLibreNavigationControl
        position="top-right"
        :options="{ visualizePitch: true }"
      />

      <ScriptMapLibreMarker
        :position="[144.9631, -37.8136]"
        aria-label="Melbourne CBD marker"
        title="Melbourne CBD"
      >
        <ScriptMapLibrePopup>
          <strong>Melbourne CBD</strong><br>
          A MapLibre marker loaded through Nuxt Scripts.
        </ScriptMapLibrePopup>
      </ScriptMapLibreMarker>

      <ScriptMapLibreGeoJson
        source-id="melbourne-boundary"
        :data="melbourneBoundary"
        :layers="boundaryLayers"
      />
    </ScriptMapLibreMap>

    <div class="controls" aria-label="Map camera controls">
      <button type="button" @click="showBotanicGardens">
        Explore the Botanic Gardens
      </button>
      <button class="secondary" type="button" @click="resetCamera">
        Reset camera
      </button>
      <output>Zoom {{ zoom.toFixed(1) }} · Bearing {{ bearing.toFixed(0) }}° · Pitch {{ pitch.toFixed(0) }}°</output>
    </div>
  </main>
</template>

<style scoped>
.maplibre-demo {
  display: grid;
  gap: 1.5rem;
  width: min(72rem, calc(100% - 2rem));
  margin: 3rem auto;
}

header {
  max-width: 48rem;
}

.eyebrow {
  color: #396cb2;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin-block: 0.25rem 0.75rem;
}

.map-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  border: 1px solid #bfd2ea;
  background: #eef5fb;
  color: #244773;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

button {
  padding: 0.65rem 1rem;
  border: 1px solid #244773;
  border-radius: 0.5rem;
  background: #396cb2;
  color: white;
  cursor: pointer;
  font: inherit;
  font-weight: 650;
}

button:hover {
  background: #244773;
}

button.secondary {
  background: white;
  color: #244773;
}

button.secondary:hover {
  background: #eef5fb;
}

button:focus-visible {
  outline: 3px solid #8db7e1;
  outline-offset: 3px;
}

output {
  color: #4b5563;
  font-variant-numeric: tabular-nums;
}
</style>
