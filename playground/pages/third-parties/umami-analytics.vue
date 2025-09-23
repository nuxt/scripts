<script lang="ts" setup>
import { ref, useHead } from '#imports'

useHead({
  title: 'Umami Analytics',
})

// Umami Analytics with custom configuration
const { proxy, status } = useScriptUmamiAnalytics({
  websiteId: 'demo-website-id-123',
  hostUrl: 'https://analytics.example.com', // Optional: custom Umami instance
  autoTrack: true,
  domains: ['localhost', 'example.com'],
  tag: 'playground',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})

const eventCounter = ref(0)
const sessionData = ref({
  userId: '',
  userType: 'visitor',
  plan: 'free',
})

function trackPageView() {
  // Track current page view
  proxy.track()
}

function trackCustomEvent() {
  eventCounter.value++
  proxy.track('button-click', {
    button_name: 'Demo Button',
    click_count: eventCounter.value,
    timestamp: Date.now(),
    page_section: 'playground',
  })
}

function trackConversion() {
  proxy.track('conversion', {
    conversion_type: 'demo_purchase',
    value: 39.99,
    currency: 'USD',
    product: 'Demo Product',
    category: 'digital',
  })
}

function trackDownload() {
  proxy.track('file-download', {
    file_name: 'demo-guide.pdf',
    file_type: 'pdf',
    file_size: '2.4MB',
    download_source: 'playground',
  })
}

function trackFormSubmission() {
  proxy.track('form-submit', {
    form_name: 'contact_form',
    form_type: 'lead_generation',
    fields_completed: 4,
    time_spent: 120, // seconds
  })
}

function identifySession() {
  if (sessionData.value.userId) {
    proxy.identify({
      user_id: sessionData.value.userId,
      user_type: sessionData.value.userType,
      plan: sessionData.value.plan,
      session_start: new Date().toISOString(),
      environment: 'playground',
    })
  }
  else {
    // Identify without user ID (anonymous session data)
    proxy.identify({
      user_type: sessionData.value.userType,
      plan: sessionData.value.plan,
      session_start: new Date().toISOString(),
      environment: 'playground',
    })
  }
}

function trackUserFlow() {
  // Simulate a user flow with multiple events
  proxy.track('page-load', { page: 'umami_demo' })

  setTimeout(() => {
    proxy.track('content-view', { content_type: 'demo', section: 'analytics' })
  }, 1000)

  setTimeout(() => {
    proxy.track('interaction', { interaction_type: 'scroll', depth: '50%' })
  }, 3000)

  setTimeout(() => {
    proxy.track('engagement', { engagement_type: 'time_on_page', duration: 30 })
  }, 5000)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold">
        Umami Analytics
      </h1>
      <p class="text-gray-600 mt-2">
        Privacy-focused, open-source web analytics platform. Simple, fast, and GDPR compliant.
      </p>
      <UAlert
        icon="i-heroicons-information-circle"
        color="blue"
        variant="soft"
        class="mt-4"
        title="Demo Configuration"
        description="This example uses a demo website ID. Replace with your actual Umami website ID for production use."
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
          <span class="font-medium">Configuration:</span>
          <ul class="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>Auto-tracking enabled for page views</li>
            <li>Domain filtering: localhost, example.com</li>
            <li>Tagged as: playground</li>
            <li>Custom host URL configured</li>
            <li>Privacy-focused (no cookies, no personal data)</li>
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
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <UButton
            :disabled="status !== 'loaded'"
            @click="trackPageView"
          >
            Track Page View
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            @click="trackCustomEvent"
          >
            Custom Event ({{ eventCounter }})
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
            @click="trackDownload"
          >
            Track Download
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            color="purple"
            @click="trackFormSubmission"
          >
            Form Submit
          </UButton>

          <UButton
            :disabled="status !== 'loaded'"
            color="orange"
            @click="trackUserFlow"
          >
            Track User Flow
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
          Session Identification
        </h2>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UInput
            v-model="sessionData.userId"
            placeholder="User ID (optional)"
            label="User ID"
          />
          <USelect
            v-model="sessionData.userType"
            :options="[
              { label: 'Visitor', value: 'visitor' },
              { label: 'User', value: 'user' },
              { label: 'Customer', value: 'customer' },
              { label: 'Admin', value: 'admin' },
            ]"
            label="User Type"
          />
          <USelect
            v-model="sessionData.plan"
            :options="[
              { label: 'Free', value: 'free' },
              { label: 'Pro', value: 'pro' },
              { label: 'Enterprise', value: 'enterprise' },
            ]"
            label="Plan"
          />
        </div>

        <UButton
          :disabled="status !== 'loaded'"
          @click="identifySession"
        >
          Identify Session
        </UButton>
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
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>const { proxy, status } = useScriptUmamiAnalytics({
  websiteId: 'your-website-id',
  hostUrl: 'https://your-umami-instance.com', // optional
  autoTrack: true,
  domains: ['yourdomain.com'],
  tag: 'environment-tag',
  scriptOptions: {
    trigger: 'onNuxtReady',
  },
})</code></pre>
        </div>

        <div>
          <h3 class="font-medium mb-2">
            Event Tracking API
          </h3>
          <pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto"><code>// Track page view (automatically tracked by default)
proxy.track()

// Track custom events
proxy.track('button-click', { button_name: 'CTA', value: 25 })

// Track conversions
proxy.track('conversion', { type: 'purchase', value: 99.99 })

// Identify sessions (anonymous or with user data)
proxy.identify({ user_type: 'customer', plan: 'pro' })
proxy.identify({ user_id: '123', subscription: 'premium' })</code></pre>
        </div>

        <div>
          <h3 class="font-medium mb-2">
            Privacy Features
          </h3>
          <ul class="list-disc list-inside space-y-1">
            <li>No cookies used for tracking</li>
            <li>No personal data collection</li>
            <li>GDPR compliant by design</li>
            <li>Lightweight script (&lt; 2KB)</li>
            <li>Self-hosted option available</li>
          </ul>
        </div>
      </div>
    </UCard>
  </div>
</template>
