<script lang="ts" setup>
import { useHead, useScriptXPixel } from '#imports'
import { ref } from 'vue'

useHead({ title: 'X Pixel - First Party' })
const { status, proxy } = useScriptXPixel({ id: 'ol7lz' })
const result = ref('')

function trackPageView() {
  proxy.twq('track', 'PageView')
  result.value = 'PageView tracked'
}

function trackEvent() {
  proxy.twq('track', 'ViewContent')
  result.value = 'ViewContent tracked'
}
</script>

<template>
  <div>
    <h1>X Pixel First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="trackPageView">
        Track PageView
      </button>
      <button @click="trackEvent">
        Track ViewContent
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>
