<script lang="ts" setup>
import { useHead, useScriptRybbitAnalytics } from '#imports'

useHead({ title: 'Rybbit - First Party' })
const { status } = useScriptRybbitAnalytics({ analyticsId: 'test-id' })
</script>

<template>
  <div>
    <h1>Rybbit First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
