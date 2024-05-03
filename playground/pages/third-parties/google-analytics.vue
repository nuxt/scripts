<script lang="ts" setup>
import { useScriptGoogleAnalytics } from '../../../src/runtime/registry/google-analytics'
import { useHead } from '#imports'

useHead({
  title: 'Google Analytics',
})

// composables return the underlying api as a proxy object and a $script with the script state
const { gtag, $script } = useScriptGoogleAnalytics({
  id: 'UA-110806111-1',
}) // id set via nuxt scripts module config
gtag('event', 'page_view', {
  page_title: 'Google Analytics',
  page_location: 'https://harlanzw.com/third-parties/google-analytics',
  page_path: '/third-parties/google-analytics',
})
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
