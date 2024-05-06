<script setup>
import { ref } from 'vue'

const videoid = ref(331567154)

function changeVideo() {
  videoid.value = videoid.value === 190063150 ? 331567154 : 190063150
}
</script>

<template>
  <div>
    <div>
      <iframe
        width="600"
        height="450"
        style="border:0"
        loading="lazy"
        allowfullscreen
        referrerpolicy="no-referrer-when-downgrade"
        src="https://www.google.com/maps/embed/v1/place?key=AIzaSyAOEIQ_xOdLx2dNwnFMzyJoswwvPCTcGzU
    &q=Space+Needle,Seattle+WA"
      />
    </div>
    <UButton
      class="mt-5"
      @click="changeVideo"
    >
      change video
    </UButton>
  </div>
</template>
