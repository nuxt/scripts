<script setup lang="ts">
const { status } = useScriptMeasuremysiteAnalytics({ key: 'pk_test123', scriptOptions: { trigger: 'client' } })
</script>

<template>
  <ClientOnly>
    <div id="status">
      {{ status }}
    </div>
  </ClientOnly>
</template>
