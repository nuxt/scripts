<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Statable Analytics',
})

// Replace this placeholder with a paid-plan Statable Site ID.
const { status, proxy } = useScriptStatableAnalytics({
  siteId: '123456',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// The proxy queues this call until the tracker loads.
proxy.t('Mount', { fired_at: 'component_setup' })

const clicks = ref(0)

function trackClick() {
  clicks.value++
  proxy.t('Button Click', { count: clicks.value })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Statable Analytics
      </h1>
      <p class="text-gray-600 mt-2">
        Cookie-free analytics. The script can be bundled; beacons go to Statable.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        class="mt-4"
        title="Demo Site ID"
        description="123456 is a placeholder. Use a Site ID from a paid Statable plan to load the tracker and send events."
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
          <code>proxy.t()</code> queues calls until the tracker loads.
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
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { proxy, status } = useScriptStatableAnalytics({
  siteId: 'YOUR_SITE_ID',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})</code></pre>
        </div>

        <div>
          <h3 class="font-medium mb-2">
            Track Events
          </h3>
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>proxy.t('Sign Up', { plan: 'pro' })
proxy.t('Purchase', { plan: 'annual', amount: 99 })</code></pre>
        </div>
      </div>
    </UCard>
  </div>
</template>
