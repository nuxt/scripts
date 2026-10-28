<script setup lang="ts">
const { status } = useScriptPrivatusAnalytics({ site: 'pa_test123', scriptOptions: { trigger: 'client' } })
</script>

<template>
  <ClientOnly>
    <div id="status">
      {{ status }}
    </div>
  </ClientOnly>
</template>
