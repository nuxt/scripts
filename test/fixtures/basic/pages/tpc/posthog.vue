<script setup lang="ts">
import type { PostHog } from 'posthog-js'
import { ref, watch, onMounted, useScriptPostHog } from '#imports'

// eslint-disable-next-line no-console
console.log('[PostHog Test] Component initializing...')

const { proxy, status, onLoaded, load } = useScriptPostHog({
  apiKey: 'phc_CkMaDU6dr11eJoQdAiSJb1rC324dogk3T952gJ6fD9W',
  region: 'us',
  config: {
    person_profiles: 'identified_only',
    autocapture: false,
    capture_pageview: false,
  },
  scriptOptions: {
    trigger: 'onNuxtReady', // Load immediately when Nuxt is ready
  },
})

// eslint-disable-next-line no-console
console.log('[PostHog Test] useScriptPostHog called, initial status:', status.value)

watch(status, (newStatus) => {
  // eslint-disable-next-line no-console
  console.log('[PostHog Test] Status changed to:', newStatus)
})

const eventCaptured = ref(false)
const identifyCalled = ref(false)
const featureFlagValue = ref<boolean | undefined>(undefined)
const featureFlagPayload = ref<any>(undefined)

function captureTestEvent() {
  // eslint-disable-next-line no-console
  console.log('[PostHog Test] Capturing event...')
  proxy.posthog.capture('test_event', {
    property1: 'value1',
    property2: 42,
  })
  eventCaptured.value = true
  // eslint-disable-next-line no-console
  console.log('[PostHog Test] Event captured flag set to true')
}

function identifyTestUser() {
  // eslint-disable-next-line no-console
  console.log('[PostHog Test] Identifying user...')
  proxy.posthog.identify('test-user-123', {
    email: 'test@example.com',
    name: 'Test User',
  })
  identifyCalled.value = true
  // eslint-disable-next-line no-console
  console.log('[PostHog Test] Identify flag set to true')
}

onLoaded(({ posthog }: { posthog: PostHog }) => {
  // eslint-disable-next-line no-console
  console.log('[PostHog Test] onLoaded callback triggered!')
  // Check feature flag (we'll mock this in the test)
  featureFlagValue.value = posthog.isFeatureEnabled('test-feature-flag')
  // eslint-disable-next-line no-console
  console.log('[PostHog Test] Feature flag value:', featureFlagValue.value)

  // Get feature flag payload
  featureFlagPayload.value = posthog.getFeatureFlagPayload('test-feature-flag')
  // eslint-disable-next-line no-console
  console.log('[PostHog Test] Feature flag payload:', featureFlagPayload.value)
})

onMounted(() => {
  // eslint-disable-next-line no-console
  console.log('[PostHog Test] Component mounted, status:', status.value)
  // Manually trigger load
  // eslint-disable-next-line no-console
  console.log('[PostHog Test] Calling load()...')
  load()
})
</script>

<template>
  <div>
    <div id="status">
      {{ status }}
    </div>

    <div id="event-captured">
      {{ eventCaptured }}
    </div>

    <div id="identify-called">
      {{ identifyCalled }}
    </div>

    <div id="feature-flag-value">
      {{ featureFlagValue }}
    </div>

    <div id="feature-flag-payload">
      {{ JSON.stringify(featureFlagPayload) }}
    </div>

    <button id="capture-event" @click="captureTestEvent">
      Capture Event
    </button>

    <button id="identify-user" @click="identifyTestUser">
      Identify User
    </button>
  </div>
</template>
