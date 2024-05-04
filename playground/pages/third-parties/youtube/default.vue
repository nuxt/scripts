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
      <iframe width="640" height="480" :src="`https://www.youtube.com/embed/${videoid}`" title="" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
    </div>
    <UButton
      class="mt-5"
      @click="changeVideo"
    >
      change video
    </UButton>
  </div>
</template>
