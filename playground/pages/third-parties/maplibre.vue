<script setup lang="ts">
import type { Feature, FeatureCollection, LineString } from 'geojson'
import type { LngLatLike } from 'maplibre-gl'
import { computed, ref } from 'vue'

interface DeliveryCheckpoint {
  id: string
  label: string
  detail: string
  eta: string
  position: [number, number]
}

const checkpoints: DeliveryCheckpoint[] = [
  {
    id: 'warehouse',
    label: 'West Melbourne depot',
    detail: 'Parcel collected',
    eta: '9:10 am',
    position: [144.9495, -37.8101],
  },
  {
    id: 'docklands',
    label: 'Docklands checkpoint',
    detail: 'Courier heading east',
    eta: '9:24 am',
    position: [144.9538, -37.8151],
  },
  {
    id: 'southbank',
    label: 'Southbank checkpoint',
    detail: 'Final approach',
    eta: '9:38 am',
    position: [144.9632, -37.8227],
  },
  {
    id: 'customer',
    label: 'Flinders Lane delivery',
    detail: 'Customer destination',
    eta: '9:45 am',
    position: [144.9687, -37.8154],
  },
]

const currentCheckpointIndex = ref(0)
const selectedCheckpointId = ref(checkpoints[0]!.id)
const center = ref<LngLatLike>(checkpoints[0]!.position)
const zoom = ref(13.5)
const bearing = ref(0)
const pitch = ref(0)

const currentCheckpoint = computed(() => checkpoints[currentCheckpointIndex.value]!)
const courierPosition = computed(() => currentCheckpoint.value.position)
const courierLabel = computed(() => `Courier at ${currentCheckpoint.value.label}`)
const deliveryComplete = computed(() => currentCheckpointIndex.value === checkpoints.length - 1)

const routeData = computed<FeatureCollection<LineString>>(() => {
  const completedCoordinates = checkpoints
    .slice(0, currentCheckpointIndex.value + 1)
    .map(checkpoint => checkpoint.position)

  if (completedCoordinates.length === 1)
    completedCoordinates.push(completedCoordinates[0]!)

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { progress: 'remaining' },
        geometry: {
          type: 'LineString',
          coordinates: checkpoints.map(checkpoint => checkpoint.position),
        },
      },
      {
        type: 'Feature',
        properties: { progress: 'completed' },
        geometry: {
          type: 'LineString',
          coordinates: completedCoordinates,
        },
      },
    ],
  }
})

const routeLayers = [
  {
    id: 'delivery-route',
    type: 'line' as const,
    filter: ['==', ['get', 'progress'], 'remaining'],
    paint: {
      'line-color': '#64748b',
      'line-opacity': 0.65,
      'line-width': 5,
    },
  },
  {
    id: 'delivery-progress',
    type: 'line' as const,
    filter: ['==', ['get', 'progress'], 'completed'],
    paint: {
      'line-color': '#2563eb',
      'line-width': 6,
    },
  },
]

function selectCheckpoint(checkpoint: DeliveryCheckpoint) {
  selectedCheckpointId.value = checkpoint.id
  center.value = checkpoint.position
  zoom.value = 15
}

function advanceCourier() {
  if (deliveryComplete.value)
    return

  currentCheckpointIndex.value += 1
  const checkpoint = checkpoints[currentCheckpointIndex.value]!
  selectedCheckpointId.value = checkpoint.id
  center.value = checkpoint.position
  zoom.value = 15
  bearing.value = 18
  pitch.value = 35
}

function resetDelivery() {
  currentCheckpointIndex.value = 0
  selectedCheckpointId.value = checkpoints[0]!.id
  center.value = checkpoints[0]!.position
  zoom.value = 13.5
  bearing.value = 0
  pitch.value = 0
}
</script>

<template>
  <article class="maplibre-demo" aria-labelledby="maplibre-demo-title">
    <header>
      <p class="eyebrow">
        Real-world example · MapLibre
      </p>
      <h1 id="maplibre-demo-title">
        Track a delivery in real time
      </h1>
      <p>
        A keyless delivery tracker with a reactive courier marker, route progress, selectable checkpoints, and an accessible text alternative.
      </p>
    </header>

    <div class="tracker-layout">
      <aside class="delivery-panel" aria-labelledby="delivery-progress-title">
        <div>
          <p class="panel-kicker">
            Order NS-2048
          </p>
          <h2 id="delivery-progress-title">
            Delivery progress
          </h2>
        </div>

        <ol class="checkpoint-list">
          <li v-for="(checkpoint, index) in checkpoints" :key="checkpoint.id">
            <button
              class="checkpoint-button"
              :class="{
                complete: index < currentCheckpointIndex,
                current: index === currentCheckpointIndex,
              }"
              type="button"
              :aria-pressed="selectedCheckpointId === checkpoint.id"
              @click="selectCheckpoint(checkpoint)"
            >
              <span class="checkpoint-marker" aria-hidden="true">{{ index + 1 }}</span>
              <span>
                <strong>{{ checkpoint.label }}</strong>
                <small>{{ checkpoint.detail }} · {{ checkpoint.eta }}</small>
              </span>
            </button>
          </li>
        </ol>

        <div class="delivery-actions" role="group" aria-label="Delivery simulation controls">
          <button
            class="primary-button"
            type="button"
            :disabled="deliveryComplete"
            @click="advanceCourier"
          >
            {{ deliveryComplete ? 'Delivery complete' : 'Advance courier' }}
          </button>
          <button class="secondary-button" type="button" @click="resetDelivery">
            Reset
          </button>
        </div>

        <p class="delivery-status" aria-live="polite">
          Current status: <strong>{{ currentCheckpoint.detail }}</strong>
        </p>
      </aside>

      <ScriptMapLibreMap
        v-model:center="center"
        v-model:zoom="zoom"
        v-model:bearing="bearing"
        v-model:pitch="pitch"
        map-style="https://tiles.openfreemap.org/styles/liberty"
        width="100%"
        height="clamp(30rem, 62vw, 38rem)"
        aria-label="Delivery route from West Melbourne to Flinders Lane"
      >
        <template #description>
          <p>
            Delivery NS-2048 travels from West Melbourne depot to Flinders Lane via Docklands and Southbank.
            The courier is currently at {{ currentCheckpoint.label }}.
          </p>
        </template>

        <template #placeholder>
          <div class="map-state">
            Route map loads as it approaches the viewport
          </div>
        </template>

        <template #error="{ error }">
          <div class="map-state map-error" role="alert">
            Live map unavailable. Follow the delivery progress list instead. {{ error.message }}
          </div>
        </template>

        <ScriptMapLibreNavigationControl
          position="top-right"
          :options="{ visualizePitch: true }"
        />

        <ScriptMapLibreGeoJson
          source-id="delivery-route"
          :data="routeData"
          :layers="routeLayers"
        />

        <ScriptMapLibreMarker
          v-for="checkpoint in checkpoints"
          :key="checkpoint.id"
          :position="checkpoint.position"
          :aria-label="`${checkpoint.label} checkpoint`"
          :title="checkpoint.label"
          :options="{ scale: 0.75 }"
          @click="selectCheckpoint(checkpoint)"
        >
          <ScriptMapLibrePopup
            :open="selectedCheckpointId === checkpoint.id"
            :options="{ maxWidth: '18rem' }"
          >
            <strong>{{ checkpoint.label }}</strong><br>
            {{ checkpoint.detail }}<br>
            Estimated time {{ checkpoint.eta }}
          </ScriptMapLibrePopup>
        </ScriptMapLibreMarker>

        <ScriptMapLibreMarker
          :position="courierPosition"
          :aria-label="courierLabel"
          title="Current courier position"
          :options="{ color: '#2563eb', scale: 1.15 }"
        />
      </ScriptMapLibreMap>
    </div>
  </article>
</template>

<style scoped>
.maplibre-demo {
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

.tracker-layout {
  display: grid;
  grid-template-columns: minmax(17rem, 22rem) minmax(0, 1fr);
  gap: 1rem;
  align-items: stretch;
}

.delivery-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: var(--ui-bg-elevated);
}

.checkpoint-list {
  display: grid;
  padding: 0;
  margin: 0;
  list-style: none;
}

.checkpoint-list li:not(:last-child) {
  padding-block-end: 0.55rem;
}

.checkpoint-button {
  display: grid;
  grid-template-columns: 2rem 1fr;
  width: 100%;
  min-height: 4.25rem;
  padding: 0.65rem;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 0.6rem;
  background: transparent;
  color: var(--ui-text);
  cursor: pointer;
  font: inherit;
  gap: 0.65rem;
  text-align: start;
}

.checkpoint-button:hover,
.checkpoint-button[aria-pressed="true"] {
  border-color: var(--ui-border);
  background: var(--ui-bg-accented);
}

.checkpoint-button > span:last-child {
  display: grid;
  gap: 0.15rem;
}

.checkpoint-button small,
.delivery-status {
  color: var(--ui-text-toned);
}

.checkpoint-marker {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 2px solid var(--ui-border);
  border-radius: 999px;
  color: var(--ui-text-muted);
  font-size: 0.8rem;
  font-weight: 800;
}

.checkpoint-button.complete .checkpoint-marker,
.checkpoint-button.current .checkpoint-marker {
  border-color: var(--map-demo-accent);
  background: var(--map-demo-accent);
  color: var(--map-demo-on-accent);
}

.delivery-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.primary-button,
.secondary-button {
  min-height: 2.75rem;
  padding: 0.65rem 1rem;
  border: 1px solid var(--map-demo-accent);
  border-radius: 0.6rem;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.primary-button {
  background: var(--map-demo-accent);
  color: var(--map-demo-on-accent);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.secondary-button {
  background: var(--ui-bg);
  color: var(--map-demo-accent);
}

.primary-button:not(:disabled):hover,
.secondary-button:hover {
  filter: brightness(0.92);
}

.checkpoint-button:focus-visible,
.primary-button:focus-visible,
.secondary-button:focus-visible {
  outline: 3px solid var(--map-demo-accent);
  outline-offset: 3px;
}

.delivery-status {
  margin-block: auto 0;
}

.delivery-status strong {
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

:global(.dark) .maplibre-demo {
  --map-demo-accent: var(--ui-color-primary-400);
  --map-demo-on-accent: var(--ui-color-neutral-950);
}

@media (max-width: 52rem) {
  .maplibre-demo {
    margin-block: 1.5rem;
  }

  .tracker-layout {
    grid-template-columns: 1fr;
  }
}
</style>
