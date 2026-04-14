<script setup lang="ts">
import { ref, useHead, useScriptVercelAnalytics } from '#imports'

useHead({
  title: 'Vercel Analytics',
})

const beforeSendCalled = ref(false)

const { proxy, status } = useScriptVercelAnalytics({
  endpoint: '/custom/collect',
  beforeSend(event) {
    beforeSendCalled.value = true
    return event
  },
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const eventTracked = ref(false)
const pageviewSent = ref(false)
const nestedError = ref('')

function trackTestEvent() {
  proxy.track('test_event', {
    category: 'testing',
    value: 42,
  })
  eventTracked.value = true
}

function trackNestedProps() {
  try {
    proxy.track('bad_event', {
      name: 'test',
      nested: { deep: true } as any,
    })
  }
  catch (err) {
    nestedError.value = (err as Error).message
  }
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

    <div id="before-send-called">
      {{ beforeSendCalled }}
    </div>

    <div id="nested-error">
      {{ nestedError }}
    </div>

    <button id="track-event" @click="trackTestEvent">
      Track Event
    </button>

    <button id="track-nested" @click="trackNestedProps">
      Track Nested
    </button>

    <button id="send-pageview" @click="sendPageview">
      Send Pageview
    </button>
  </div>
</template>
