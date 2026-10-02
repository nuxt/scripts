<script setup lang="ts">
useScriptGoogleAnalytics({
  id: 'G-TEST',
  scriptInput: { src: 'https://www.googletagmanager.com/gtag/js?id=G-TEST' },
  scriptOptions: { partytown: true, trigger: 'onNuxtReady' },
})
</script>

<template>
  <div id="google-worker" />
</template>
