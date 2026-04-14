<script lang="ts" setup>
import { useHead, useScriptDatabuddyAnalytics } from '#imports'

useHead({ title: 'Databuddy - First Party' })
const { status } = useScriptDatabuddyAnalytics({ clientId: 'demo-client-123' })
</script>

<template>
  <div>
    <h1>Databuddy First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <p>Databuddy auto-tracks pageviews. Navigate between pages to trigger events.</p>
    <NuxtLink to="/">
      Go Home
    </NuxtLink>
  </div>
</template>
