<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Statable Analytics',
})

// `siteId` must be a site registered in Statable. 123456 is a placeholder:
// the tracker loads and every call fires, but the API rejects the events
// until you replace it with your own Site ID.
const { status, proxy } = useScriptStatableAnalytics({
  siteId: '123456',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// Fired during setup, before the tracker can have loaded: the proxy holds the
// call and replays it once the script is in. Watch the network tab for the POST.
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
        Cookieless analytics with server-side visitor identity. Bundled, never proxied.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        class="mt-4"
        title="Demo Configuration"
        description="This example uses 123456 as the Site ID, which Statable does not know: requests fire but the API rejects them. Use a Site ID from your Statable account."
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
          The button calls <code>proxy.t()</code> without checking status. A call made before
          the tracker has loaded is queued and replayed once it has.
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
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>// One function: a name and optional properties
proxy.t('Sign Up', { plan: 'pro' })

// Strings, numbers and booleans all work as property values
proxy.t('Purchase', { plan: 'annual', amount: 99 })</code></pre>
        </div>
      </div>
    </UCard>
  </div>
</template>
