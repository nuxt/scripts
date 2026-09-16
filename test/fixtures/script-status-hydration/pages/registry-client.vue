<script setup lang="ts">
// The Vercel Analytics registry fixes its trigger to `client`. The local src
// keeps the test off the network.
const { status } = useScriptVercelAnalytics({
  scriptInput: { src: '/probe.js?trigger=registry-client' },
  scriptOptions: { bundle: false },
})
useStatusLog('registry-client', status)
</script>

<template>
  <div id="status">{{ status }}</div>
</template>
