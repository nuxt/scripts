<script setup lang="ts">
import { ref } from 'vue'

const selected = ref<number | null>(null)

const places = [
  { id: 1, name: 'Sydney Opera House', desc: 'Iconic performing arts venue on Bennelong Point.', rating: 4.7, reviews: '82k', position: { lat: -33.8568, lng: 151.2153 } },
  { id: 2, name: 'Harbour Bridge', desc: 'Steel arch bridge opened in 1932, connecting the CBD to the North Shore.', rating: 4.8, reviews: '41k', position: { lat: -33.8523, lng: 151.2108 } },
  { id: 3, name: 'Bondi Beach', desc: 'Famous crescent beach popular with surfers and sunbathers.', rating: 4.6, reviews: '29k', position: { lat: -33.8908, lng: 151.2743 } },
]
</script>

<template>
  <div>
    <h2 class="text-lg font-bold mb-2">
      OverlayView Popup (click to toggle)
    </h2>
    <p class="mb-4 text-sm text-gray-600">
      Click a marker to show a fully custom popup. Click again or press × to close. Uses v-if for multiple markers.
    </p>
    <ScriptGoogleMaps
      :center="{ lat: -33.8688, lng: 151.2093 }"
      :zoom="12"
      :width="800"
      :height="500"
      above-the-fold
      :map-options="{ mapId: 'DEMO_MAP_ID' }"
    >
      <ScriptGoogleMapsAdvancedMarkerElement
        v-for="place in places"
        :key="place.id"
        :position="place.position"
        @click="selected = selected === place.id ? null : place.id"
      >
        <ScriptGoogleMapsOverlayView
          v-if="selected === place.id"
          anchor="bottom-center"
          :offset="{ x: 0, y: -50 }"
        >
          <div class="w-64 rounded-xl bg-white p-4 shadow-lg ring-1 ring-black/5">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-sm font-semibold text-gray-900">
                {{ place.name }}
              </h3>
              <button
                class="shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                @click.stop="selected = null"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
            <div class="mt-1 flex items-center gap-1 text-xs text-gray-500">
              <span class="font-medium text-yellow-500">★ {{ place.rating }}</span>
              <span>({{ place.reviews }} reviews)</span>
            </div>
            <p class="mt-2 text-xs leading-relaxed text-gray-600">
              {{ place.desc }}
            </p>
            <button class="mt-3 w-full rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
              View details
            </button>
          </div>
        </ScriptGoogleMapsOverlayView>
      </ScriptGoogleMapsAdvancedMarkerElement>
    </ScriptGoogleMaps>
  </div>
</template>
