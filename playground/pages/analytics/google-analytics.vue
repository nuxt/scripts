<script lang="ts" setup>
/* eslint-disable no-console */
import { useGoogleAnalytics } from '#imports'

// composables return the underlying api as a proxy object and a $script with the script state
const { $script } = useGoogleAnalytics({
  id: 'GA-123456789-1',
})

// we can manually wait for the script to be ready (TODO error handling)
$script.waitForLoad().then(({ gtag, dataLayer }) => {
  console.log('gtag', gtag)
  console.log('dataLayer', dataLayer)
  // example to fire an event:
  // gtag('event', 'newsletter_signup_gtag', { time: new Date() })
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
