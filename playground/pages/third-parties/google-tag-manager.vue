<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Google Tag Manager',
})

// composables return the underlying api as a proxy object and the script state
const { proxy, status } = useScriptGoogleTagManager({
  id: 'GTM-MWW974PF',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// Use proxy to push events to dataLayer
proxy.dataLayer.push({
  event: 'page_view',
  page_title: 'Google Tag Manager',
  page_location: 'https://harlanzw.com/third-parties/google-tag-manager',
  page_path: '/third-parties/google-tag-manager',
})

// Push additional events
proxy.dataLayer.push({
  event: 'pageview',
  page_path: '/google-tag-manager',
})
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
