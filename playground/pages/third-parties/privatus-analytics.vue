<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Privatus Analytics',
})

// Replace this placeholder with the site ID from your Privatus Analytics dashboard.
const { status, proxy } = useScriptPrivatusAnalytics({
  site: 'pa_test123',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

proxy.track('Mount', { fired_at: 'component_setup' })

const clicks = ref(0)

function trackClick() {
  clicks.value++
  proxy.track('Button Click', { count: clicks.value })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Privatus Analytics
      </h1>
      <p class="text-gray-600 mt-2">
        Cookieless analytics. The script can be bundled. Beacons go to Privatus Analytics.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        class="mt-4"
        title="Demo site ID"
        description="pa_test123 is a placeholder, so the API drops its events. The tracker also sends nothing on localhost."
      />
    </div>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Custom Events
        </h2>
      </template>

      <div class="space-y-4">
        <div>
          <span class="font-medium">Current Status:</span>
          <UBadge
            :color="status === 'loaded' ? 'success' : status === 'loading' ? 'warning' : 'neutral'"
            class="ml-2"
          >
            {{ status }}
          </UBadge>
        </div>

        <UButton @click="trackClick">
          Track click ({{ clicks }})
        </UButton>

        <p class="text-sm text-gray-500">
          <code>proxy.track()</code> queues calls until the tracker loads.
        </p>
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
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { proxy, status } = useScriptPrivatusAnalytics({
  site: 'pa_YOURSITEID',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})</code></pre>
        </div>

        <div>
          <h3 class="font-medium mb-2">
            Track Events
          </h3>
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>proxy.track('Signup', { plan: 'pro' })
proxy.track('Purchase', { revenue: 49, currency: 'USD' })</code></pre>
        </div>
      </div>
    </UCard>
  </div>
</template>
