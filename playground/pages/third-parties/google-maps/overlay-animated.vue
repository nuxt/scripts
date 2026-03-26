<script setup lang="ts">
import { ref } from 'vue'

const openId = ref<number | null>(null)

const places = [
  { id: 1, name: 'Sydney Opera House', desc: 'Iconic performing arts venue on Bennelong Point.', rating: 4.7, reviews: '82k', position: { lat: -33.8568, lng: 151.2153 } },
  { id: 2, name: 'Harbour Bridge', desc: 'Steel arch bridge opened in 1932.', rating: 4.8, reviews: '41k', position: { lat: -33.8523, lng: 151.2108 } },
  { id: 3, name: 'Bondi Beach', desc: 'Famous crescent beach popular with surfers.', rating: 4.6, reviews: '29k', position: { lat: -33.8908, lng: 151.2743 } },
]

function isOpen(id: number) {
  return openId.value === id
}

function toggle(id: number) {
  openId.value = openId.value === id ? null : id
}

function close(id: number) {
  if (openId.value === id)
    openId.value = null
}
</script>

<template>
  <div>
    <h2 class="text-lg font-bold mb-2">
      OverlayView with Animated Transitions
    </h2>
    <p class="mb-4 text-sm text-gray-600">
      Click a marker to open/close. Uses data-state attribute for CSS enter/leave animations.
    </p>
    <ScriptGoogleMaps
      :center="{ lat: -33.8688, lng: 151.2093 }"
      :zoom="12"
      :width="800"
      :height="500"
      :map-options="{ mapId: 'DEMO_MAP_ID' }"
    >
      <ScriptGoogleMapsMarker
        v-for="place in places"
        :key="place.id"
        :position="place.position"
        @click="toggle(place.id)"
      >
        <ScriptGoogleMapsOverlayView
          :open="isOpen(place.id)"
          anchor="bottom-center"
          :offset="{ x: 0, y: -50 }"
          @update:open="(v: boolean) => { if (!v) close(place.id) }"
        >
            <div class="overlay-popup">
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-sm font-semibold text-gray-900">
                  {{ place.name }}
                </h3>
                <button
                  class="shrink-0 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  @click.stop="close(place.id)"
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
            </div>
        </ScriptGoogleMapsOverlayView>
      </ScriptGoogleMapsMarker>
    </ScriptGoogleMaps>
  </div>
</template>

<style scoped>
.overlay-popup {
  width: 16rem;
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.overlay-popup[data-state="open"] {
  animation: overlayIn 200ms ease-out forwards;
}

.overlay-popup[data-state="closed"] {
  animation: overlayOut 150ms ease-in forwards;
}

@keyframes overlayIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes overlayOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(4px);
  }
}
</style>
