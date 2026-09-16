<script lang="ts" setup>
import { ref, useHead, watch } from '#imports'

useHead({
  title: 'Pulse Analytics',
})

// `domain` must be a site registered in Pulse. example.com is a placeholder:
// the tracker loads and every call fires, but the API answers 404 until you
// replace it with your own domain.
const { proxy, status, onLoaded } = useScriptPulseAnalytics({
  domain: 'example.com',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

// `proxy` forwards void calls and never returns a value, so a query method such
// as cleanPath() is read from the loaded API instead.
let loadedApi: { cleanPath: () => string | null } | undefined
onLoaded((api) => {
  loadedApi = api
})

const eventLog = ref<Array<{ time: string, event: string, status: string }>>([])

function logEvent(event: string, scriptStatus: string) {
  eventLog.value.unshift({
    time: new Date().toLocaleTimeString(),
    event,
    status: scriptStatus,
  })
  if (eventLog.value.length > 20) {
    eventLog.value.pop()
  }
}

watch(status, (newStatus, oldStatus) => {
  logEvent(`Status: ${oldStatus} -> ${newStatus}`, newStatus)
}, { immediate: true })

// Fired during setup, before the tracker can have loaded: it must queue and
// flush once the script is in. Watch the network tab for the POST.
proxy.track('mount_event', { fired_at: 'component_setup' })
logEvent(`Queued on mount: proxy.track('mount_event')`, status.value)

const clicks = ref(0)

function trackClick() {
  clicks.value++
  proxy.track('button_click', { count: String(clicks.value) })
  logEvent(`proxy.track('button_click', { count: '${clicks.value}' })`, status.value)
}

function trackPurchase() {
  proxy.track('purchase', { product: 'annual_plan', currency: 'EUR' }, 99)
  logEvent(`proxy.track('purchase', { product, currency }, 99)`, status.value)
}

function readCleanPath() {
  logEvent(`cleanPath() => ${loadedApi ? loadedApi.cleanPath() : 'not loaded yet'}`, status.value)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Pulse Analytics
      </h1>
      <p class="text-gray-600 mt-2">
        Cookie-free analytics with server-side visitor identity. Bundled, never proxied.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="info"
        variant="soft"
        class="mt-4"
        title="Demo Configuration"
        description="This example uses example.com as the site domain, which Pulse does not know: requests fire but the API answers 404. Use a domain registered in your Pulse account."
      />
    </div>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          Queue Before Load
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

        <div class="flex flex-wrap gap-3">
          <UButton color="warning" @click="trackClick">
            Track Click (no status check) ({{ clicks }})
          </UButton>
          <UButton color="warning" variant="outline" @click="trackPurchase">
            Track Purchase (no status check)
          </UButton>
          <UButton color="info" variant="outline" @click="readCleanPath">
            Read cleanPath() (via onLoaded)
          </UButton>
        </div>

        <p class="text-sm text-gray-500">
          These buttons call proxy methods without checking status. Calls made before
          the tracker has loaded are queued and replayed once it has.
        </p>
      </div>
    </UCard>

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
            :color="entry.status === 'loaded' ? 'success' : 'warning'"
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
          Implementation
        </h2>
      </template>

      <div class="space-y-4 text-sm">
        <div>
          <h3 class="font-medium mb-2">
            Basic Setup
          </h3>
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { proxy, status } = useScriptPulseAnalytics({
  domain: 'example.com',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})</code></pre>
        </div>

        <div>
          <h3 class="font-medium mb-2">
            Track Events
          </h3>
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>// Custom event with string properties
proxy.track('signup', { plan: 'pro' })

// Revenue goes in the third argument, not in props
proxy.track('purchase', { product: 'annual_plan' }, 99)</code></pre>
        </div>
      </div>
    </UCard>
  </div>
</template>
