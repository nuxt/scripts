<script setup lang="ts">
import type { Feature, Polygon } from 'geojson'
import type { LatLngExpression } from 'leaflet'
import { ref } from 'vue'

const center = ref<LatLngExpression>([-37.8136, 144.9631])
const geoJson: Feature<Polygon> = {
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

function showBotanicGardens() {
  center.value = [-37.8304, 144.9796]
}
</script>

<template>
  <main class="leaflet-demo">
    <header>
      <p class="eyebrow">
        Nuxt Scripts × Leaflet
      </p>
      <h1>Provider-agnostic, lazy-loaded maps</h1>
      <p>
        The Leaflet SDK and tile requests begin only when this example approaches the viewport.
      </p>
    </header>

    <ScriptLeafletMap
      :center="center"
      :zoom="13"
      width="100%"
      :height="560"
      aria-label="Map of central Melbourne"
    >
      <template #placeholder>
        <div class="map-placeholder">
          Map loads near the viewport
        </div>
      </template>

      <ScriptLeafletTileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        :options="{
          maxZoom: 19,
          attribution: '&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap contributors</a>',
        }"
      />

      <ScriptLeafletMarker
        :position="[-37.8136, 144.9631]"
        alt="Melbourne CBD marker"
        title="Melbourne CBD"
      >
        <ScriptLeafletPopup>
          <strong>Melbourne CBD</strong><br>
          Leaflet, loaded through Nuxt Scripts.
        </ScriptLeafletPopup>
      </ScriptLeafletMarker>

      <ScriptLeafletGeoJson
        :data="geoJson"
        :options="{
          style: {
            color: '#16a34a',
            fillColor: '#86efac',
            fillOpacity: 0.2,
            weight: 2,
          },
        }"
      />
    </ScriptLeafletMap>

    <button type="button" @click="showBotanicGardens">
      Pan to the Botanic Gardens
    </button>
  </main>
</template>

<style scoped>
.leaflet-demo {
  display: grid;
  gap: 1.5rem;
  width: min(72rem, calc(100% - 2rem));
  margin: 3rem auto;
}

header {
  max-width: 48rem;
}

.eyebrow {
  color: #16a34a;
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
  border: 1px solid #d1d5db;
  background: #f3f4f6;
  color: #4b5563;
}

button {
  justify-self: start;
  padding: 0.65rem 1rem;
  border: 0;
  border-radius: 0.5rem;
  background: #166534;
  color: white;
  cursor: pointer;
  font: inherit;
  font-weight: 650;
}

button:hover {
  background: #14532d;
}

button:focus-visible {
  outline: 3px solid #86efac;
  outline-offset: 3px;
}
</style>
