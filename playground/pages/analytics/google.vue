<script lang="ts" setup>
/* eslint-disable no-console */
import { useGoogleAnalytics } from '#imports'

// composables return the underlying api as a proxy object and a $script with the script state
const { $script } = useGoogleAnalytics({
  id: 'GA-123456789-1',
})
// we can manually wait for the script to be ready (TODO error handling)
$script.waitForLoad().then(({ gtag, dataLayer }) => {
  console.log('gtag is ready', gtag)
  console.log('gtag is ready', window.gtag)
  window.gtag('event', 'newsletter_signup_window', { time: new Date() })
  gtag('event', 'newsletter_signup_gtag', { time: new Date() })
  console.log('dataLayer', dataLayer)
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
