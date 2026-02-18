<script lang="ts" setup>
import { useHead, useScriptGoogleTagManager } from '#imports'

useHead({
  title: 'Google Tag Manager - First Party',
})

const { status } = useScriptGoogleTagManager({
  id: 'GTM-MWW974PF',
})
</script>

<template>
  <div>
    <h1>Google Tag Manager First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
