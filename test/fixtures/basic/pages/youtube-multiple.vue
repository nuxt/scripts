<script lang="ts" setup>
const player1Ready = ref(false)
const player2Ready = ref(false)
const player3Ready = ref(false)
</script>

<template>
  <div>
    <div id="player1" style="width: 320px; height: 180px; margin-bottom: 10px;">
      <ScriptYouTubePlayer
        video-id="d_IFKP1Ofq0"
        :width="320"
        :height="180"
        @ready="player1Ready = true"
      />
    </div>
    <div id="player1-status">
      {{ player1Ready ? 'ready' : 'waiting' }}
    </div>

    <div id="player2" style="width: 320px; height: 180px; margin-bottom: 10px;">
      <ScriptYouTubePlayer
        video-id="dQw4w9WgXcQ"
        :width="320"
        :height="180"
        @ready="player2Ready = true"
      />
    </div>
    <div id="player2-status">
      {{ player2Ready ? 'ready' : 'waiting' }}
    </div>

    <div id="player3" style="width: 320px; height: 180px; margin-bottom: 10px;">
      <ScriptYouTubePlayer
        video-id="jNQXAC9IVRw"
        :width="320"
        :height="180"
        @ready="player3Ready = true"
      />
    </div>
    <div id="player3-status">
      {{ player3Ready ? 'ready' : 'waiting' }}
    </div>
  </div>
</template>
