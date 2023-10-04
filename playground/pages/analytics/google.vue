<script lang="ts" setup>
import { useGoogleAnalytics } from '#imports'

// composables return the underlying api as a proxy object and a $script with the script state
const { $script } = useGoogleAnalytics({
  id: 'GA-123456789-1',
})
// we can manually wait for the script to be ready (TODO error handling)
$script.waitForLoad().then((gtag) => {
  // eslint-disable-next-line no-console
  console.log('gtag is ready', gtag)
})
</script>

<template>
  <div>
    <ConversionButton />
    <ClientOnly>
      <div>
        loaded: {{ $script.loaded }}
      </div>
    </ClientOnly>
  </div>
</template>
