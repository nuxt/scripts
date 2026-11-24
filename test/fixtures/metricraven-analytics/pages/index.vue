<script setup lang="ts">
const { status } = useScriptMetricRavenAnalytics({ siteId: 'ana_pub_example', scriptOptions: { trigger: 'client' } })
</script>

<template>
  <ClientOnly>
    <div id="status">
      {{ status }}
    </div>
  </ClientOnly>
</template>
