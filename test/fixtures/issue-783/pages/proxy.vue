<script setup lang="ts">
// Reading the token is what would normally lift it into the SSR payload.
// With `security.pageToken: false` it must stay null.
const proxyToken = useScriptProxyToken()
</script>

<template>
  <div id="with-proxy">
    token: {{ proxyToken ?? 'none' }}
  </div>
</template>
