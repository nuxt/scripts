<script setup lang="ts">
const { $scripts } = useNuxtApp() as any
const rc = useRuntimeConfig()
</script>

<template>
  <div>
    <div id="globals-runtime">{{ JSON.stringify(rc.public.scriptsGlobals) }}</div>
    <div id="script-src">{{ $scripts?.trustedShops?.$script?.src || $scripts?.trustedShops?.options?.src || '' }}</div>
    <div id="awin-registered">{{ $scripts?.awin ? 'yes' : 'no' }}</div>
    <div id="scrads-src">{{ $scripts?.scrads?.$script?.src || $scripts?.scrads?.options?.src || '' }}</div>
    <div id="legacy-registered">{{ $scripts?.legacy ? 'yes' : 'no' }}</div>
  </div>
</template>
