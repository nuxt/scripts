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
      <iframe title="vimeo-player" :src="`https://player.vimeo.com/video/${videoid}`" width="640" height="360" frameborder="0" allowfullscreen />
    </div>
    <UButton
      class="mt-5"
      @click="changeVideo"
    >
      change video
    </UButton>
  </div>
</template>
