<script lang="ts" setup>
import { useHead, useScriptGoogleAdsense } from '#imports'

useHead({ title: 'Google AdSense - First Party' })
const { status } = useScriptGoogleAdsense({ client: 'ca-pub-3940256099942544' })
</script>

<template>
  <div>
    <h1>Google AdSense First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <p>AdSense loads automatically. Check Network tab for script loading and ad requests.</p>
  </div>
</template>
