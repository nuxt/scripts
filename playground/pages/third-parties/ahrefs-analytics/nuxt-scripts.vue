<script lang="ts" setup>
import { useHead, useScriptAhrefsAnalytics } from '#imports'

useHead({
  title: 'Ahrefs Web Analytics',
})

const { status, proxy } = useScriptAhrefsAnalytics({
  key: 'demo-key',
})

function trackCustomEvent() {
  proxy.AhrefsAnalytics.sendEvent('demo-button-click', {
    props: { source: 'playground' },
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <div class="space-x-2 mt-2">
        <UButton @click="trackCustomEvent">
          Send Custom Event
        </UButton>
        <UButton to="/">
          Navigate (SPA)
        </UButton>
      </div>
    </ClientOnly>
  </div>
</template>
