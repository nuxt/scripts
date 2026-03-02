<script lang="ts" setup>
import { useHead, useScriptFathomAnalytics } from '#imports'

useHead({ title: 'Fathom - First Party' })
const { status } = useScriptFathomAnalytics({ site: 'TEST' })
</script>

<template>
  <div>
    <h1>Fathom First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
