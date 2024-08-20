<script setup>
import { ref } from 'vue'

const videoid = ref(331567154)

function changeVideo() {
  videoid.value = videoid.value === 190063150 ? 331567154 : 190063150
}
</script>

<template>
  <div>
    <ScriptVimeoPlayer
      :id="videoid"
      above-the-fold
      class="w-[900px] w-[100%] h-[700px]"
    />
    <UButton
      class="mt-5"
      @click="changeVideo"
    >
      change video
    </UButton>
  </div>
</template>
