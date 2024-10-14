<script lang="ts" setup>
import { useHead, useScriptMatomoAnalytics } from '#imports'

useHead({
  title: 'Matomo Analytics',
})

// composables return the underlying api as a proxy object and the script state
const { status, proxy } = useScriptMatomoAnalytics({
  cloudId: 'nuxt.matomo.cloud',
  siteId: '1',
})

proxy._paq.push(['trackPageView'])
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
    </ClientOnly>
  </div>
</template>
