<script lang="ts" setup>
import { useHead, useScriptTikTokPixel } from '#imports'

useHead({
  title: 'TikTok Pixel',
})

const { status, proxy } = useScriptTikTokPixel({
  id: 'YOUR_PIXEL_ID',
})

function trackEvent() {
  proxy.ttq('track', 'ViewContent', {
    content_name: 'Test Product',
    content_type: 'product',
  })
}

function trackPurchase() {
  proxy.ttq('track', 'CompletePayment', {
    value: 99.99,
    currency: 'USD',
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <div class="flex gap-2 mt-4">
        <UButton @click="trackEvent">
          Track ViewContent
        </UButton>
        <UButton @click="trackPurchase">
          Track Purchase
        </UButton>
      </div>
    </ClientOnly>
  </div>
</template>
