<script setup lang="ts">
const { custom, valid } = useRoute().query
const { status } = custom
  ? useScriptCloudflareWebAnalytics({
      token: '123',
      scriptInput: { src: 'data:text/javascript,void%200' },
      scriptOptions: { bundle: false },
    })
  : useScriptCloudflareWebAnalytics({ token: valid ? 'a'.repeat(32) : '123' })
</script>

<template>
  <p id="status">{{ status }}</p>
</template>
