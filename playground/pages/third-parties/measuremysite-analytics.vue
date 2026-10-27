<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'measuremy.site',
})

// Replace this placeholder with your site's public key.
const { status, proxy } = useScriptMeasuremysiteAnalytics({
  key: 'pk_test123',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

proxy.track('mount', { fired_at: 'component_setup' })

const clicks = ref(0)

function trackClick() {
  clicks.value++
  proxy.track('button_click', { count: clicks.value })
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        measuremy.site
      </h1>
      <p class="text-gray-600 mt-2">
        Cookieless analytics. The script can be bundled; beacons go to measuremy.site.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        class="mt-4"
        title="Demo key"
        description="pk_test123 is a placeholder. Use the public key from your measuremy.site dashboard to record visits."
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
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { proxy, status } = useScriptMeasuremysiteAnalytics({
  key: 'pk_...',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})</code></pre>
        </div>

        <div>
          <h3 class="font-medium mb-2">
            Track Events
          </h3>
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>proxy.track('signup', { plan: 'pro' })
proxy.track('purchase', { plan: 'annual', amount: 99 })</code></pre>
        </div>
      </div>
    </UCard>
  </div>
</template>
