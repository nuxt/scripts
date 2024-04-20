<script setup>
import { ref } from 'vue'

const label = ref('Play!')
const videoid = ref('d_IFKP1Ofq0')

function changeVideo() {
  videoid.value = 'N8siuNjyV7A'
}

function changeLabel() {
  label.value = 'Spiele!'
}
</script>

<template>
  <div>
    <div>
      <YoutubeEmbed
        :video-id="videoid"
        :play-label="label"
      />
    </div>
    <div class="button-container">
      <button
        class="button"
        @click="changeVideo"
      >
        change video
      </button>
      <button
        class="button"
        @click="changeLabel"
      >
        change label
      </button>
    </div>
  </div>
</template>

<style>
.button-container {
  margin: 20px 0;
}

.button {
  background-color: orange;
  border-radius: 8px;
  padding: 4px 8px;
  cursor: pointer;
}

.button:not(:last-child) {
  margin-right: 8px;
}
</style>
