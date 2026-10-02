<script setup lang="ts">
useScriptGoogleAnalytics({
  id: 'G-TEST',
  scriptOptions: { partytown: false, trigger: 'onNuxtReady' },
})
</script>

<template>
  <div id="google-main" />
</template>
