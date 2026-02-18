<script setup>
import { ref } from 'vue'

const youtubeId = ref('d_IFKP1Ofq0')
const vimeoId = ref(331567154)
</script>

<template>
  <div class="p-5">
    <h1 class="text-2xl font-bold mb-5">
      Video Players Comparison
    </h1>
    <div class="grid grid-cols-2 gap-5">
      <div>
        <h2 class="text-lg font-semibold mb-2">
          YouTube
        </h2>
        <ScriptYouTubePlayer :video-id="youtubeId" above-the-fold />
      </div>
      <div>
        <h2 class="text-lg font-semibold mb-2">
          Vimeo
        </h2>
        <ScriptVimeoPlayer :id="vimeoId" above-the-fold />
      </div>
    </div>
  </div>
</template>
