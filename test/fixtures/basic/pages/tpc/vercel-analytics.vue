<script setup lang="ts">
import { ref, useHead, useScriptVercelAnalytics } from '#imports'

useHead({
  title: 'Vercel Analytics',
})

const { proxy, status } = useScriptVercelAnalytics({
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const eventTracked = ref(false)
const pageviewSent = ref(false)

function trackTestEvent() {
  proxy.track('test_event', {
    category: 'testing',
    value: 42,
  })
  eventTracked.value = true
}

function sendPageview() {
  proxy.pageview({ path: '/test-page' })
  pageviewSent.value = true
}
</script>

<template>
  <div>
    <div id="status">
      {{ status }}
    </div>

    <div id="event-tracked">
      {{ eventTracked }}
    </div>

    <div id="pageview-sent">
      {{ pageviewSent }}
    </div>

    <button id="track-event" @click="trackTestEvent">
      Track Event
    </button>

    <button id="send-pageview" @click="sendPageview">
      Send Pageview
    </button>
  </div>
</template>
