<script lang="ts" setup>
import { useGoogleTagManager } from '#imports'

// composables return the underlying api as a proxy object and a $script with the script state
const { $script, dataLayer } = useGoogleTagManager({
  id: 'GTM-MNJD4B',
})
dataLayer.push({
  event: 'pageview',
  page_path: '/google-tag-manager',
})
// we can manually wait for the script to be ready (TODO error handling)
$script.waitForLoad().then(() => {
  // eslint-disable-next-line no-console
  console.log('gtm is ready', dataLayer)
})
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        loaded: {{ $script.loaded }}
      </div>
    </ClientOnly>
  </div>
</template>
