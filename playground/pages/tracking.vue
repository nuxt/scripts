<script lang="ts" setup>
import { ref, useTrackingScript } from '#imports'

const cookiesEnabled = ref(false)
useTrackingScript('https://www.googletagmanager.com/gtag/js?id=GTM-5ZQZJZ', {
  consent: cookiesEnabled,
  ignoreDoNotTrack: true,
})
</script>

<template>
  <div>
    <div>
      <div>cookies enabled: {{ cookiesEnabled }}</div>
      <UButton @click="cookiesEnabled = !cookiesEnabled">
        Toggle Cookies
      </UButton>
    </div>
  </div>
</template>
