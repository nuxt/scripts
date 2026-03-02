<script lang="ts" setup>
import { useHead, useScriptUmamiAnalytics } from '#imports'

useHead({ title: 'Umami - First Party' })
const { status } = useScriptUmamiAnalytics({ websiteId: 'test-id' })
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
