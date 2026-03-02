<script lang="ts" setup>
import { useHead, useScriptDatabuddyAnalytics } from '#imports'

useHead({ title: 'Databuddy - First Party' })
const { status } = useScriptDatabuddyAnalytics({ id: 'test-id' })
</script>

<template>
  <div>
    <h1>Databuddy First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
