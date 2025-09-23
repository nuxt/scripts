<script lang="ts" setup>
import { useHead } from '#imports'

useHead({
  title: 'Google Analytics - Optional ID Loading',
})

// Simulate dynamic customer data
const customerData = ref<{ gtagId?: string }>({})
const isCustomerLoaded = ref(false)

// Load gtag.js without initial ID
const { proxy: gtagProxy, status } = useScriptGoogleAnalytics({
  key: 'gtag-optional',
})

// Simulate loading customer data
function loadCustomerData() {
  customerData.value = { gtagId: 'G-CUSTOMER123' }
  isCustomerLoaded.value = true

  // Now configure gtag with the customer ID
  gtagProxy.gtag('config', customerData.value.gtagId!)

  // Send a test event
  gtagProxy.gtag('event', 'customer_loaded', {
    customer_id: 'test-customer',
    value: 1,
  })
}

// Load additional ID dynamically
function loadAdditionalId() {
  gtagProxy.gtag('config', 'G-ADDITIONAL456')
  gtagProxy.gtag('event', 'additional_tracking', {
    source: 'dynamic_load',
  })
}

// Test sending events
function sendTestEvent() {
  gtagProxy.gtag('event', 'test_interaction', {
    event_category: 'user_action',
    event_label: 'button_click',
  })
}
</script>

<template>
  <div class="space-y-4 p-4">
    <h1 class="text-2xl font-bold">
      Google Analytics - Optional ID Loading
    </h1>

    <div class="p-4 rounded">
      <h2 class="font-semibold mb-2">
        Status
      </h2>
      <ClientOnly>
        <div>Script status: {{ status }}</div>
        <div>Customer loaded: {{ isCustomerLoaded }}</div>
        <div>Customer ID: {{ customerData.gtagId || 'Not loaded' }}</div>
      </ClientOnly>
    </div>

    <div class="space-y-2">
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        :disabled="isCustomerLoaded"
        @click="loadCustomerData"
      >
        {{ isCustomerLoaded ? 'Customer Data Loaded' : 'Load Customer Data' }}
      </button>

      <button
        class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        :disabled="status !== 'awaitingLoad'"
        @click="loadAdditionalId"
      >
        Load Additional ID
      </button>

      <button
        class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        :disabled="!isCustomerLoaded"
        @click="sendTestEvent"
      >
        Send Test Event
      </button>
    </div>
  </div>
</template>
