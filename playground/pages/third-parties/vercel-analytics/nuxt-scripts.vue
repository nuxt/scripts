<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Vercel Analytics',
})

const beforeSendLog = ref<string[]>([])

const { proxy, status } = useScriptVercelAnalytics({
  endpoint: '/custom/collect',
  beforeSend(event) {
    beforeSendLog.value.push(`${event.type}: ${event.url}`)
    return event
  },
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const eventTracked = ref(false)
const pageviewSent = ref(false)

function trackEvent() {
  proxy.track('button_click', {
    button: 'demo',
    page: '/third-parties/vercel-analytics',
  })
  eventTracked.value = true
}

function trackNested() {
  proxy.track('nested_test', {
    valid: 'yes',
    nested: { should: 'be stripped' } as any,
  })
}

function sendPageview() {
  proxy.pageview({ path: '/test-page', route: '/[slug]' })
  pageviewSent.value = true
}

function dumpQueue() {
  // eslint-disable-next-line no-console
  console.log('window.vaq:', JSON.stringify(window.vaq, null, 2))
  // eslint-disable-next-line no-console
  console.log('window.vam:', window.vam)
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <ClientOnly>
      <div>status: {{ status }}</div>
      <div>mode (window.vam): {{ $window?.vam ?? 'n/a' }}</div>
      <div v-if="eventTracked">
        Event tracked!
      </div>
      <div v-if="pageviewSent">
        Pageview sent!
      </div>
      <div v-if="beforeSendLog.length">
        beforeSend calls: {{ beforeSendLog }}
      </div>
    </ClientOnly>

    <div class="flex gap-2">
      <button @click="trackEvent">
        Track Event
      </button>
      <button @click="trackNested">
        Track Nested (stripped in prod)
      </button>
      <button @click="sendPageview">
        Send Pageview
      </button>
      <button @click="dumpQueue">
        Dump Queue (console)
      </button>
    </div>
  </div>
</template>
