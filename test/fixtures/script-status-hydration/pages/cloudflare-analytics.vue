<script setup lang="ts">
const trigger = useRoute().query.trigger
const { load, status } = useScriptCloudflareWebAnalytics({
  token: 'test-token',
  scriptInput: { src: '/probe.js?analytics=cloudflare' },
  scriptOptions: {
    bundle: false,
    trigger: trigger === 'client' || trigger === 'server' || trigger === 'manual' ? trigger : undefined,
  },
})
</script>

<template>
  <div id="status">{{ status }}</div>
  <button type="button" @click="load()">Load beacon</button>
</template>
