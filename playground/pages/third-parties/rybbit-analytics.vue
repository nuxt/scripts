<script lang="ts" setup>
import { ref, useHead, watch } from '#imports'

useHead({
  title: 'Rybbit Analytics',
})

// Rybbit Analytics with real site ID
const { proxy, status } = useScriptRybbitAnalytics({
  siteId: '874',
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
const eventLog = ref<Array<{ time: string, event: string, status: string }>>([])

// Log status changes
watch(status, (newStatus, oldStatus) => {
  logEvent(`Status: ${oldStatus} -> ${newStatus}`, newStatus)
}, { immediate: true })

// Fire an event immediately on component setup (before script loads)
// This is the actual test for issue #461
const initialStatus = status.value
proxy.event('mount_event', { fired_at: 'component_setup' })
logEvent(`proxy.event('mount_event') - FIRED ON MOUNT`, initialStatus)

function logEvent(event: string, scriptStatus: string) {
  eventLog.value.unshift({
    time: new Date().toLocaleTimeString(),
    event,
    status: scriptStatus,
  })
  // Keep only last 20 events
  if (eventLog.value.length > 20) {
    eventLog.value.pop()
  }
}

function trackCustomEvent() {
  eventCounter.value++
  const currentStatus = status.value
  proxy.event('button_click', {
    button_name: 'Custom Event Button',
    click_count: eventCounter.value,
    timestamp: Date.now(),
  })
  logEvent(`proxy.event('button_click', { count: ${eventCounter.value} })`, currentStatus)
}

// Test event that runs immediately without checking status
// This is what the issue #461 tests - events called before script is ready
function trackImmediateEvent() {
  const currentStatus = status.value
  proxy.event('immediate_test', { timestamp: Date.now() })
  logEvent(`proxy.event('immediate_test') - NO STATUS CHECK`, currentStatus)
}

function trackConversion() {
  const currentStatus = status.value
  proxy.event('conversion', {
    conversion_type: 'demo_conversion',
    value: 25.99,
    currency: 'USD',
  })
  logEvent(`proxy.event('conversion')`, currentStatus)
}

function identifyUser() {
  if (userId.value) {
    proxy.identify(userId.value)
    logEvent(`proxy.identify('${userId.value}')`, status.value)
  }
}

function clearUser() {
  proxy.clearUserId()
  logEvent(`proxy.clearUserId()`, status.value)
  userId.value = ''
}

function getCurrentUserId() {
  const currentId = proxy.getUserId()
  logEvent(`proxy.getUserId() => ${currentId}`, status.value)
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

    <!-- Issue #461 Test Section -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold text-orange-600">
          Issue #461 Test: Refresh Behavior
        </h2>
      </template>

      <div class="space-y-4">
        <UAlert
          icon="i-heroicons-exclamation-triangle"
          color="orange"
          variant="soft"
          title="How to Test"
        >
          <ol class="list-decimal list-inside space-y-1 text-sm mt-2">
            <li>Refresh this page (Cmd+R / F5)</li>
            <li>Immediately click "Track Immediate Event" before status becomes "loaded"</li>
            <li>Check the Event Log - event should be queued and sent when script loads</li>
            <li>Compare: Navigate away and back (SPA nav) - events should work immediately</li>
          </ol>
        </UAlert>

        <div>
          <span class="font-medium">Current Status:</span>
          <UBadge
            :color="status === 'loaded' ? 'green' : status === 'loading' ? 'yellow' : 'gray'"
            class="ml-2"
          >
            {{ status }}
          </UBadge>
        </div>

        <div class="flex gap-3">
          <UButton
            color="orange"
            @click="trackImmediateEvent"
          >
            Track Immediate Event (no status check)
          </UButton>
        </div>

        <p class="text-sm text-gray-500">
          This button calls proxy.event() without checking if status === 'loaded'.
          Before the fix, this would silently fail on page refresh.
        </p>
      </div>
    </UCard>

    <!-- Event Log -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Event Log
        </h2>
      </template>

      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div
          v-for="(entry, i) in eventLog"
          :key="i"
          class="text-sm font-mono p-2 rounded"
          :class="entry.status === 'loaded' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'"
        >
          <span class="text-gray-500">{{ entry.time }}</span>
          <UBadge
            :color="entry.status === 'loaded' ? 'green' : 'yellow'"
            size="xs"
            class="mx-2"
          >
            {{ entry.status }}
          </UBadge>
          <span>{{ entry.event }}</span>
        </div>
        <div v-if="eventLog.length === 0" class="text-gray-400 text-sm">
          No events logged yet
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Script Status
        </h2>
      </template>

      <div class="space-y-4">
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
