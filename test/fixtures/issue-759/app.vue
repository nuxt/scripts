<script setup lang="ts">
const { $scripts } = useNuxtApp() as any
const rc = useRuntimeConfig()
</script>

<template>
  <div>
    <div id="globals-runtime">{{ JSON.stringify(rc.public.scriptsGlobals) }}</div>
    <div id="script-src">{{ $scripts?.trustedShops?.$script?.src || $scripts?.trustedShops?.options?.src || '' }}</div>
  </div>
</template>
