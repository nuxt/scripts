<script setup lang="ts">
// This demonstrates loading a custom registry script on a specific page
// The script will appear in DevTools when this page is visited

// Auto-imported from our custom registry
const { proxy, status } = useScriptMyCustomScript({
  apiKey: 'demo-api-key-123',
  scriptOptions: {
    trigger: 'onNuxtReady',
    // Add some DevTools metadata for demonstration
    performanceMarkFeature: 'custom-registry-demo',
  },
})

const events = ref<any[]>([])

function trackEvent(eventName: string, data?: Record<string, any>) {
  if (proxy.track) {
    proxy.track(eventName, data)

    // Update our local events list for demo purposes
    if (proxy.getEvents) {
      events.value = proxy.getEvents()
    }
  }
}

function identifyUser() {
  if (proxy.identify) {
    proxy.identify('user-123')
  }
}

// Watch for status changes
watch(status, (newStatus) => {
  console.log('Script status changed:', newStatus)
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Custom Registry Script Demo
      </h1>
      <p class="text-gray-600 mt-2">
        This page demonstrates a custom script registered via the <code>scripts:registry</code> hook.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="blue"
        variant="soft"
        class="mt-4"
        title="DevTools Integration"
        description="Open Nuxt DevTools > Scripts tab to see this custom script with its metadata and status."
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
          <span class="font-medium">Script Features:</span>
          <ul class="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Auto-imported as <code>useScriptMyCustomScript</code></li>
            <li>Registered via <code>scripts:registry</code> hook</li>
            <li>Full TypeScript support</li>
            <li>DevTools integration with metadata</li>
            <li>Schema validation in development</li>
            <li>Page-specific loading (only loads on this page)</li>
          </ul>
        </div>

        <div>
          <span class="font-medium">DevTools Visibility:</span>
          <p class="text-sm text-gray-600 mt-1">
            This script only loads when you visit this page. Check the Scripts tab in Nuxt DevTools to see:
          </p>
          <ul class="list-disc list-inside mt-1 space-y-1 text-xs text-gray-600">
            <li>Script appears with "My Custom Script" label</li>
            <li>Registry metadata shows <code>apiKey: demo-api-key-123</code></li>
            <li>Status transitions from "awaitingLoad" → "loading" → "loaded"</li>
            <li>Events are tracked as the script loads and functions are called</li>
          </ul>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Demo Actions
        </h2>
      </template>

      <div class="space-y-4">
        <div class="flex flex-wrap gap-3">
          <UButton
            :disabled="status !== 'loaded'"
            @click="trackEvent('page_view', { page: '/features/custom-registry' })"
          >
            Track Page View
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            color="blue"
            @click="trackEvent('button_click', { button: 'demo-action', timestamp: Date.now() })"
          >
            Track Button Click
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            color="green"
            @click="identifyUser()"
          >
            Identify User
          </UButton>
        </div>

        <div v-if="status !== 'loaded'" class="text-sm text-gray-500">
          Actions will be enabled once the script is loaded.
        </div>
      </div>
    </UCard>

    <UCard v-if="events.length > 0">
      <template #header>
        <h2 class="text-xl font-semibold">
          Tracked Events
        </h2>
      </template>

      <div class="space-y-2">
        <div
          v-for="(event, index) in events"
          :key="index"
          class="p-3 bg-gray-50 rounded-lg"
        >
          <div class="flex justify-between items-start">
            <span class="font-medium">{{ event.event }}</span>
            <span class="text-sm text-gray-500">{{ new Date(event.timestamp).toLocaleTimeString() }}</span>
          </div>
          <pre v-if="event.data && Object.keys(event.data).length > 0" class="text-sm mt-2 text-gray-600">{{ JSON.stringify(event.data, null, 2) }}</pre>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Implementation Details
        </h2>
      </template>

      <div class="space-y-4 text-sm">
        <div>
          <h3 class="font-medium">
            Registry Configuration (nuxt.config.ts)
          </h3>
          <pre class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto"><code /></pre>
        </div>

        <div>
          <h3 class="font-medium">
            Usage in Component
          </h3>
          <pre class="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto"><code /></pre>
        </div>
      </div>
    </UCard>
  </div>
</template>
