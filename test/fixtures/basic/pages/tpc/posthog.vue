<script setup lang="ts">
import type { PostHog } from 'posthog-js'

const { proxy, status, onLoaded } = useScriptPostHog({
  apiKey: 'phc_test_key_e2e_testing',
  // Use a mock endpoint that we can intercept in tests
  config: {
    api_host: 'http://localhost:3000/mock-posthog',
    autocapture: false,
    capture_pageview: false,
  },
})

const eventCaptured = ref(false)
const identifyCalled = ref(false)
const featureFlagValue = ref<boolean | undefined>(undefined)
const featureFlagPayload = ref<any>(undefined)

function captureTestEvent() {
  proxy.posthog.capture('test_event', {
    property1: 'value1',
    property2: 42,
  })
  eventCaptured.value = true
}

function identifyTestUser() {
  proxy.posthog.identify('test-user-123', {
    email: 'test@example.com',
    name: 'Test User',
  })
  identifyCalled.value = true
}

onLoaded(({ posthog }: { posthog: PostHog }) => {
  // Check feature flag (we'll mock this in the test)
  featureFlagValue.value = posthog.isFeatureEnabled('test-feature-flag')

  // Get feature flag payload
  featureFlagPayload.value = posthog.getFeatureFlagPayload('test-feature-flag')
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
