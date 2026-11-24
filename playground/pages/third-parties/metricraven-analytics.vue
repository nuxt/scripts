<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'MetricRaven',
})

// Replace this placeholder with your site's public ID (ana_pub_…).
const { status, proxy } = useScriptMetricRavenAnalytics({
  siteId: 'ana_pub_example',
  allowLocalhost: true,
  debug: true,
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const clicks = ref(0)
const visitorId = ref<string | null>(null)

function trackClick() {
  clicks.value++
  proxy.track('button_click', { count: clicks.value })
}

function identify() {
  proxy.identify('user_42', { name: 'Jane Doe', email: 'jane@example.com' })
}

function readVisitorId() {
  visitorId.value = window.metricraven?.getVisitorId() ?? null
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        MetricRaven
      </h1>
      <p class="text-gray-600 mt-2">
        Web analytics with revenue attribution. The script can be bundled; events go to MetricRaven.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        class="mt-4"
        title="Demo site ID"
        description="ana_pub_example is a placeholder. Use your site's public ID, with localhost listed in its domains, to send events. Debug mode logs what the tracker sends to the console."
      />
    </div>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Events and identity
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

        <div class="flex gap-2">
          <UButton @click="trackClick">
            Track click ({{ clicks }})
          </UButton>
          <UButton color="neutral" @click="identify">
            Identify
          </UButton>
          <UButton color="neutral" @click="readVisitorId">
            Read visitor ID
          </UButton>
        </div>

        <p v-if="visitorId" class="text-sm">
          Visitor ID: <code>{{ visitorId }}</code>
        </p>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Implementation
        </h2>
      </template>

      <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { proxy } = useScriptMetricRavenAnalytics({
  siteId: 'ana_pub_…',
})

proxy.track('signup', { plan: 'pro' })
proxy.identify('user_42', { email: 'jane@example.com' })</code></pre>
    </UCard>
  </div>
</template>
