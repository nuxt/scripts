<script setup>
import { ref } from 'vue'

const videoid = ref('d_IFKP1Ofq0')

function changeVideo() {
  videoid.value = 'N8siuNjyV7A'
}
</script>

<template>
  <div>
    <div>
      <YouTubeEmbed
        :video-id="videoid"
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
