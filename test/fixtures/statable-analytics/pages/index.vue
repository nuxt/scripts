<script setup lang="ts">
const { status } = useScriptStatableAnalytics({ siteId: '123456', scriptOptions: { trigger: 'client' } })
</script>

<template>
  <ClientOnly>
    <div id="status">
      {{ status }}
    </div>
  </ClientOnly>
</template>
