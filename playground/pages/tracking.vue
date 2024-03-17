<script lang="ts" setup>
import { createConsentTrigger, ref, useScript } from '#imports'

const cookiesEnabled = ref(false)
useScript('https://www.googletagmanager.com/gtag/js?id=GTM-5ZQZJZ', {
  trigger: createConsentTrigger({
    consent: cookiesEnabled,
  }),
  assetStrategy: 'bundle',
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
