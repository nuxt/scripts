<script lang="ts" setup>
import { useScriptMatomoAnalytics } from '../../../src/runtime/registry/matomo-analytics'
import { useHead } from '#imports'

useHead({
  title: 'Matomo Analytics',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { $script, _paq } = useScriptMatomoAnalytics({
  matomoUrl: 'https://matomo.example.com',
  siteId: 'KBXOGxgqMFjm2mxtJDJg0iDn5AnGYb9C',
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
