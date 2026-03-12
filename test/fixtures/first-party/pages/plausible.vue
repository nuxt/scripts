<script lang="ts" setup>
import { useHead, useScriptPlausibleAnalytics } from '#imports'

useHead({ title: 'Plausible - First Party' })
const { status } = useScriptPlausibleAnalytics({ domain: 'scripts.nuxt.com', extension: 'local' })
</script>

<template>
  <div>
    <h1>Plausible First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
