<script lang="ts" setup>
import { useHead, useScriptMatomoAnalytics } from '#imports'

useHead({
  title: 'Matomo Analytics',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script, _paq } = useScriptMatomoAnalytics({
  matomoUrl: 'https://nuxt-scripts-demo.matomo.cloud',
  siteId: '1',
})

_paq.push(['trackPageView'])
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ $script.status.value }}
      </div>
    </ClientOnly>
  </div>
</template>
