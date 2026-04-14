<script lang="ts" setup>
import { useHead, useScriptBingUet } from '#imports'

useHead({
  title: 'Bing UET',
})

const { status, proxy } = useScriptBingUet({
  id: '247021147',
  onBeforeUetStart(uetq) {
    uetq.push('consent', 'default', {
      ad_storage: 'denied',
    })
  },
})

function triggerEvent() {
  proxy.uetq.push('event', 'purchase', {
    revenue_value: 49.99,
    currency: 'USD',
  })
}

function grantConsent() {
  proxy.uetq.push('consent', 'update', {
    ad_storage: 'granted',
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <button @click="triggerEvent">
        Trigger Event
      </button>
      <button @click="grantConsent">
        Grant Consent
      </button>
    </ClientOnly>
  </div>
</template>
