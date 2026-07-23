<script setup lang="ts">
import type { Feature, Polygon } from 'geojson'
import type { LatLngExpression, LatLngTuple } from 'leaflet'
import { computed, ref } from 'vue'

interface PickupLocation {
  id: string
  name: string
  address: string
  hours: string
  position: LatLngTuple
}

const pickupLocations: PickupLocation[] = [
  {
    id: 'flinders-lane',
    name: 'Flinders Lane',
    address: 'Centre Place, Melbourne VIC',
    hours: 'Open today until 6 pm',
    position: [-37.8164, 144.9656],
  },
  {
    id: 'queen-victoria-market',
    name: 'Queen Victoria Market',
    address: 'Queen Street, Melbourne VIC',
    hours: 'Open today until 3 pm',
    position: [-37.8076, 144.9568],
  },
  {
    id: 'southbank',
    name: 'Southbank',
    address: 'Southbank Promenade, Southbank VIC',
    hours: 'Open today until 8 pm',
    position: [-37.8202, 144.9655],
  },
]

const selectedLocationId = ref(pickupLocations[0]!.id)
const center = ref<LatLngExpression>(pickupLocations[0]!.position)
const zoom = ref(14)
const selectedLocation = computed(() => pickupLocations.find(location => location.id === selectedLocationId.value)!)

const sameDayDeliveryZone: Feature<Polygon> = {
  type: 'Feature',
  properties: { name: 'Same-day delivery zone' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [144.946, -37.802],
      [144.982, -37.802],
      [144.986, -37.828],
      [144.951, -37.832],
      [144.946, -37.802],
    ]],
  },
}

function selectLocation(location: PickupLocation) {
  selectedLocationId.value = location.id
  center.value = location.position
  zoom.value = 16
}

function showAllLocations() {
  selectedLocationId.value = pickupLocations[0]!.id
  center.value = [-37.8136, 144.9631]
  zoom.value = 13
}
</script>

<template>
  <article class="leaflet-demo" aria-labelledby="leaflet-demo-title">
    <header>
      <p class="eyebrow">
        Real-world example · Leaflet
      </p>
      <h1 id="leaflet-demo-title">
        Find a pickup location
      </h1>
      <p>
        A keyless store locator with OpenStreetMap tiles, selectable locations, opening hours, and a GeoJSON delivery zone.
      </p>
    </header>

    <div class="locator-layout">
      <aside class="location-panel" aria-labelledby="pickup-locations-title">
        <div>
          <p class="panel-kicker">
            Three locations
          </p>
          <h2 id="pickup-locations-title">
            Pickup in Melbourne
          </h2>
        </div>

        <ol class="location-list">
          <li v-for="location in pickupLocations" :key="location.id">
            <button
              class="location-button"
              :class="{ active: selectedLocationId === location.id }"
              type="button"
              :aria-pressed="selectedLocationId === location.id"
              @click="selectLocation(location)"
            >
              <strong>{{ location.name }}</strong>
              <span>{{ location.address }}</span>
              <small>{{ location.hours }}</small>
            </button>
          </li>
        </ol>

        <button class="show-all-button" type="button" @click="showAllLocations">
          Show all locations
        </button>

        <p class="selection-status" aria-live="polite">
          Selected: <strong>{{ selectedLocation.name }}</strong>
        </p>
      </aside>

      <ScriptLeafletMap
        v-model:center="center"
        v-model:zoom="zoom"
        width="100%"
        height="clamp(30rem, 62vw, 38rem)"
        aria-label="Pickup locations and same-day delivery zone in central Melbourne"
      >
        <template #placeholder>
          <div class="map-state">
            Map loads as it approaches the viewport
          </div>
        </template>

        <template #error="{ error }">
          <div class="map-state map-error" role="alert">
            The location map is unavailable. {{ error.message }}
          </div>
        </template>

        <ScriptLeafletTileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          :options="{
            maxZoom: 19,
            attribution: '&copy; <a href=&quot;https://www.openstreetmap.org/copyright&quot;>OpenStreetMap contributors</a>',
          }"
        />

        <ScriptLeafletGeoJson
          :data="sameDayDeliveryZone"
          :options="{
            style: {
              color: '#15803d',
              fillColor: '#86efac',
              fillOpacity: 0.18,
              weight: 2,
            },
          }"
        />

        <ScriptLeafletMarker
          v-for="location in pickupLocations"
          :key="location.id"
          :position="location.position"
          :alt="`${location.name} pickup location`"
          :title="location.name"
          @click="selectLocation(location)"
        >
          <ScriptLeafletPopup
            :open="selectedLocationId === location.id"
            :options="{ minWidth: 180 }"
          >
            <strong>{{ location.name }}</strong><br>
            {{ location.address }}<br>
            {{ location.hours }}
          </ScriptLeafletPopup>
        </ScriptLeafletMarker>
      </ScriptLeafletMap>
    </div>
  </article>
</template>

<style scoped>
.leaflet-demo {
  --map-demo-accent: var(--ui-color-primary-700);
  --map-demo-on-accent: var(--ui-color-neutral-50);

  display: grid;
  gap: 1.5rem;
  width: min(72rem, 100%);
  margin-block: 3rem;
}

header {
  max-width: 48rem;
}

header > p:last-child {
  color: var(--ui-text-muted);
  font-size: 1.05rem;
}

.eyebrow,
.panel-kicker {
  color: var(--map-demo-accent);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin-block: 0.25rem 0.75rem;
}

h2 {
  margin-block: 0.2rem 0;
  font-size: 1.25rem;
}

.locator-layout {
  display: grid;
  grid-template-columns: minmax(16rem, 21rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: stretch;
}

.location-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: var(--ui-bg-elevated);
}

.location-list {
  display: grid;
  gap: 0.65rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.location-button {
  display: grid;
  width: 100%;
  min-height: 4.75rem;
  padding: 0.8rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.6rem;
  background: var(--ui-bg);
  color: var(--ui-text);
  cursor: pointer;
  font: inherit;
  gap: 0.15rem;
  text-align: start;
}

.location-button:hover {
  border-color: var(--map-demo-accent);
  background: var(--ui-bg-accented);
}

.location-button.active {
  border-color: var(--map-demo-accent);
  box-shadow: 0 0 0 1px var(--map-demo-accent);
}

.location-button span,
.location-button small,
.selection-status {
  color: var(--ui-text-toned);
}

.show-all-button {
  min-height: 2.75rem;
  padding: 0.65rem 1rem;
  border: 1px solid var(--map-demo-accent);
  border-radius: 0.6rem;
  background: var(--map-demo-accent);
  color: var(--map-demo-on-accent);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.show-all-button:hover {
  filter: brightness(0.92);
}

.location-button:focus-visible,
.show-all-button:focus-visible {
  outline: 3px solid var(--map-demo-accent);
  outline-offset: 3px;
}

.selection-status {
  margin-block: auto 0;
}

.selection-status strong {
  color: var(--ui-text);
}

.map-state {
  display: grid;
  width: 100%;
  height: 100%;
  padding: 1rem;
  place-items: center;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: var(--ui-bg-muted);
  color: var(--ui-text-muted);
  text-align: center;
}

.map-error {
  color: var(--ui-error);
}

:global(.dark) .leaflet-demo {
  --map-demo-accent: var(--ui-color-primary-400);
  --map-demo-on-accent: var(--ui-color-neutral-950);
}

@media (max-width: 52rem) {
  .leaflet-demo {
    margin-block: 1.5rem;
  }

  .locator-layout {
    grid-template-columns: 1fr;
  }
}
</style>
