<script lang="ts" setup>
import { useHead, useScriptUmamiAnalytics } from '#imports'

useHead({ title: 'Umami - First Party' })
const { status } = useScriptUmamiAnalytics({ websiteId: 'ae15c227-67e8-434a-831f-67e6df88bd6c' })
</script>

<template>
  <div>
    <h1>Umami First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
