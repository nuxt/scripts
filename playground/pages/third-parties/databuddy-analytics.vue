<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Databuddy Analytics',
})

// Databuddy Analytics with comprehensive tracking configuration
const { proxy, status } = useScriptDatabuddyAnalytics({
  clientId: 'demo-client-123',
  // Core tracking features
  trackScreenViews: true,
  trackPerformance: true,
  trackSessions: true,
  // Optional tracking features
  trackWebVitals: true,
  trackErrors: true,
  trackOutgoingLinks: true,
  trackScrollDepth: true,
  trackEngagement: true,
  trackInteractions: true,
  // Performance optimizations
  enableBatching: true,
  batchSize: 10,
  batchTimeout: 5000,
  enableRetries: true,
  maxRetries: 3,
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const eventCounter = ref(0)
const userProperties = ref({
  userId: '',
  plan: 'free',
  signupDate: new Date().toISOString().split('T')[0],
})

function trackCustomEvent() {
  eventCounter.value++
  proxy.track('custom_button_click', {
    button_name: 'Demo Button',
    click_count: eventCounter.value,
    timestamp: Date.now(),
    page_section: 'playground',
  })
}

function trackConversion() {
  proxy.track('conversion_completed', {
    conversion_type: 'demo_purchase',
    value: 49.99,
    currency: 'USD',
    product_id: 'demo-product-123',
    quantity: 1,
  })
}

function trackPageView() {
  proxy.screenView('/third-parties/databuddy-analytics', {
    page_title: 'Databuddy Analytics Demo',
    referrer: document.referrer,
    user_agent: navigator.userAgent,
  })
}

function setUserProperties() {
  proxy.setGlobalProperties({
    user_id: userProperties.value.userId,
    user_plan: userProperties.value.plan,
    signup_date: userProperties.value.signupDate,
    environment: 'playground',
  })
}

function trackUserJourney() {
  // Track a sequence of events representing a user journey
  proxy.track('page_loaded', { page: 'databuddy_demo' })

  setTimeout(() => {
    proxy.track('feature_viewed', { feature: 'analytics_demo' })
  }, 1000)

  setTimeout(() => {
    proxy.track('engagement_started', { engagement_type: 'demo_interaction' })
  }, 2000)
}

function flushEvents() {
  proxy.flush()
}

function clearSession() {
  proxy.clear()
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Databuddy Analytics
      </h1>
      <p class="text-gray-600 mt-2">
        Comprehensive analytics platform with advanced tracking capabilities and performance monitoring.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="blue"
        variant="soft"
        class="mt-4"
        title="Demo Configuration"
        description="This example uses a demo client ID. Replace with your actual Databuddy client ID for production use."
      />
    </div>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Script Status
        </h2>
      </template>

      <div class="space-y-4">
        <div>
          <span class="font-medium">Current Status:</span>
          <UBadge
            :color="status === 'loaded' ? 'green' : status === 'loading' ? 'yellow' : 'gray'"
            class="ml-2"
          >
            {{ status }}
          </UBadge>
        </div>

        <div>
          <span class="font-medium">Tracking Features Enabled:</span>
          <div class="grid grid-cols-2 gap-2 mt-2 text-sm">
            <ul class="list-disc list-inside space-y-1">
              <li>Screen Views</li>
              <li>Performance Metrics</li>
              <li>Session Tracking</li>
              <li>Web Vitals</li>
              <li>Error Tracking</li>
            </ul>
            <ul class="list-disc list-inside space-y-1">
              <li>Outgoing Links</li>
              <li>Scroll Depth</li>
              <li>User Engagement</li>
              <li>Interactions</li>
              <li>Event Batching</li>
            </ul>
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Event Tracking
        </h2>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <UButton
            :disabled="status !== 'loaded'"
            @click="trackCustomEvent"
          >
            Custom Event ({{ eventCounter }})
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            color="green"
            @click="trackConversion"
          >
            Track Conversion
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            color="blue"
            @click="trackPageView"
          >
            Manual Screen View
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            color="purple"
            @click="trackUserJourney"
          >
            Track User Journey
          </UButton>
        </div>

        <div v-if="status !== 'loaded'" class="text-sm text-gray-500">
          Event tracking will be enabled once the script is loaded.
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          User Properties
        </h2>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UInput
            v-model="userProperties.userId"
            placeholder="User ID"
            label="User ID"
          />
          <USelect
            v-model="userProperties.plan"
            :options="[
              { label: 'Free', value: 'free' },
              { label: 'Pro', value: 'pro' },
              { label: 'Enterprise', value: 'enterprise' },
            ]"
            label="Plan"
          />
          <UInput
            v-model="userProperties.signupDate"
            type="date"
            label="Signup Date"
          />
        </div>

        <div class="flex gap-3">
          <UButton
            :disabled="status !== 'loaded'"
            @click="setUserProperties"
          >
            Set Global Properties
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            color="orange"
            @click="flushEvents"
          >
            Flush Events
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            color="red"
            @click="clearSession"
          >
            Clear Session
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Implementation
        </h2>
      </template>

      <div class="space-y-4 text-sm">
        <div>
          <h3 class="font-medium mb-2">
            Basic Setup
          </h3>
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { proxy, status } = useScriptDatabuddyAnalytics({
  clientId: 'your-client-id',
  // Core tracking
  trackScreenViews: true,
  trackPerformance: true,
  trackSessions: true,
  // Optional features
  trackWebVitals: true,
  trackErrors: true,
  trackOutgoingLinks: true,
  trackScrollDepth: true,
  trackEngagement: true,
  // Performance
  enableBatching: true,
  batchSize: 10,
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})</code></pre>
        </div>

        <div>
          <h3 class="font-medium mb-2">
            Event Tracking API
          </h3>
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>// Track custom events
proxy.track('button_click', { button_name: 'CTA', value: 25 })

// Manual screen views
proxy.screenView('/custom-path', { extra_data: 'value' })

// Set global properties for all events
proxy.setGlobalProperties({ user_id: '123', plan: 'pro' })

// Flush batched events immediately
proxy.flush()

// Clear session data
proxy.clear()</code></pre>
        </div>
      </div>
    </UCard>
  </div>
</template>
