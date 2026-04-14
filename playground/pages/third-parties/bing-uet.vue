<script lang="ts" setup>
import { useHead, useScriptBingUet } from '#imports'

useHead({
  title: 'Bing UET',
})

const { status, proxy } = useScriptBingUet({ id: '247021147' })

function triggerEvent() {
  proxy.uetq.push('event', 'purchase', {
    revenue_value: 49.99,
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
      <button @click="triggerEvent">
        Trigger Event
      </button>
    </ClientOnly>
  </div>
</template>
