<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Rybbit Analytics',
})

// Rybbit Analytics with demo configuration
const { proxy, status } = useScriptRybbitAnalytics({
  siteId: 'demo-site-123',
  autoTrackPageview: true,
  trackSpa: true,
  trackOutbound: true,
  trackErrors: true,
  webVitals: true,
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// Track a custom page view
proxy.pageview()

const eventCounter = ref(0)
const userId = ref('')

function trackCustomEvent() {
  eventCounter.value++
  proxy.event('button_click', {
    button_name: 'Custom Event Button',
    click_count: eventCounter.value,
    timestamp: Date.now(),
  })
}

function trackConversion() {
  proxy.event('conversion', {
    conversion_type: 'demo_conversion',
    value: 25.99,
    currency: 'USD',
  })
}

function identifyUser() {
  if (userId.value) {
    proxy.identify(userId.value)
  }
}

function clearUser() {
  proxy.clearUserId()
  userId.value = ''
}

function getCurrentUserId() {
  const currentId = proxy.getUserId()
  if (currentId) {
    userId.value = currentId
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Rybbit Analytics
      </h1>
      <p class="text-gray-600 mt-2">
        Privacy-focused analytics platform with session replay and web vitals tracking.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="blue"
        variant="soft"
        class="mt-4"
        title="Demo Configuration"
        description="This example uses a demo site ID. Replace with your actual Rybbit site ID for production use."
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
          <span class="font-medium">Features Enabled:</span>
          <ul class="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Auto page view tracking</li>
            <li>SPA navigation tracking</li>
            <li>Outbound link tracking</li>
            <li>Error tracking</li>
            <li>Web Vitals monitoring</li>
          </ul>
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
        <div class="flex flex-wrap gap-3">
          <UButton
            :disabled="status !== 'loaded'"
            @click="trackCustomEvent"
          >
            Track Custom Event ({{ eventCounter }})
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
            @click="proxy.pageview()"
          >
            Manual Page View
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
          User Identification
        </h2>
      </template>

      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <UInput
            v-model="userId"
            placeholder="Enter user ID"
            class="flex-1"
          />
          <UButton
            :disabled="status !== 'loaded' || !userId"
            @click="identifyUser"
          >
            Identify User
          </UButton>
        </div>

        <div class="flex gap-3">
          <UButton
            :disabled="status !== 'loaded'"
            color="orange"
            @click="getCurrentUserId"
          >
            Get Current User ID
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            color="red"
            @click="clearUser"
          >
            Clear User ID
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
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { proxy, status } = useScriptRybbitAnalytics({
  siteId: 'your-site-id',
  autoTrackPageview: true,
  trackSpa: true,
  trackOutbound: true,
  trackErrors: true,
  webVitals: true,
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})</code></pre>
        </div>

        <div>
          <h3 class="font-medium mb-2">
            Track Events
          </h3>
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>// Track custom events
proxy.event('button_click', { button_name: 'CTA' })

// Track conversions
proxy.event('conversion', { value: 25.99, currency: 'USD' })

// Manual page views
proxy.pageview()

// User identification
proxy.identify('user-123')
proxy.clearUserId()
const userId = proxy.getUserId()</code></pre>
        </div>
      </div>
    </UCard>
  </div>
</template>
