<script lang="ts" setup>
import { navigateTo, useHead, useScriptAhrefsAnalytics } from '#imports'

useHead({ title: 'Ahrefs Web Analytics' })

const { status } = useScriptAhrefsAnalytics()

function trackEvent() {
  ;(window as any).AhrefsAnalytics?.sendEvent('test-event', {
    props: { source: 'e2e' },
  })
}

function navigateSpa() {
  navigateTo('/')
}
</script>

<template>
  <div>
    <h1>Ahrefs Web Analytics</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <button id="trigger-event" @click="trackEvent">
      Send Event
    </button>
    <button id="trigger-spa-nav" @click="navigateSpa">
      Navigate (SPA)
    </button>
  </div>
</template>
