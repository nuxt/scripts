<script lang="ts" setup>
// Example: Integrating a custom third-party script (Cal.com)
// This pattern works for any script not in the registry

interface CalApi {
  (action: 'ui', config: Record<string, unknown>): void
  (action: 'on', event: { action: string, callback: () => void }): void
  ns: Record<string, CalApi>
  loaded?: boolean
  q?: unknown[]
}

const calLoaded = ref(false)
const bookingComplete = ref(false)

// useScript with typed API
const { status, onLoaded } = useScript<{ Cal: CalApi }>({
  src: 'https://app.cal.com/embed/embed.js',
  async: true,
}, {
  // Define how to access the script's API
  use: () => ({ Cal: window.Cal }),

  // Script loads on idle by default, or use triggers
  trigger: 'onNuxtReady',
})

// Initialize Cal.com when script loads
onLoaded(({ Cal }) => {
  calLoaded.value = true

  // Initialize the embed
  Cal('ui', {
    styles: { branding: { brandColor: '#000000' } },
    hideEventTypeDetails: false,
  })

  // Listen for booking events
  Cal('on', {
    action: 'bookingSuccessful',
    callback: () => {
      bookingComplete.value = true
    },
  })
})

// Augment window type for the script
declare global {
  interface Window {
    Cal: CalApi
  }
}
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="max-w-2xl mx-auto p-8">
        <h1 class="text-3xl font-bold mb-4">
          Custom Script Integration
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
          This example shows how to integrate any third-party script using <code>useScript()</code> directly.
        </p>

        <div class="space-y-4">
          <UCard>
            <template #header>
              <h2 class="font-semibold">
                Script Status
              </h2>
            </template>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Loading state:</span>
                <UBadge :color="status === 'loaded' ? 'success' : status === 'loading' ? 'warning' : 'neutral'">
                  {{ status }}
                </UBadge>
              </div>
              <div class="flex justify-between">
                <span>API initialized:</span>
                <UBadge :color="calLoaded ? 'success' : 'neutral'">
                  {{ calLoaded ? 'Yes' : 'No' }}
                </UBadge>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold">
                Key Concepts
              </h2>
            </template>
            <ul class="list-disc list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li><code>use()</code> - Define how to access the script's global API</li>
              <li><code>onLoaded()</code> - Run code when script is ready</li>
              <li><code>status</code> - Track loading state reactively</li>
              <li><code>trigger</code> - Control when script loads</li>
            </ul>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold">
                Code Example
              </h2>
            </template>
            <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-x-auto"><code>const { status, onLoaded } = useScript&lt;{ Cal: CalApi }&gt;({
  src: 'https://app.cal.com/embed/embed.js',
}, {
  use: () => ({ Cal: window.Cal }),
  trigger: 'onNuxtReady',
})

onLoaded(({ Cal }) => {
  Cal('ui', { styles: { ... } })
})</code></pre>
          </UCard>

          <UAlert
            v-if="bookingComplete"
            color="success"
            title="Booking Complete!"
            description="The Cal.com event callback was triggered."
          />
        </div>
      </div>
    </div>
  </UApp>
</template>
