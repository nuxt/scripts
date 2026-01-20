<script lang="ts" setup>
const showBanner = ref(true)
const consent = useScriptTriggerConsent()

// Google Tag Manager with Consent Mode v2
// GTM loads after consent, but we set default denied state first
useScriptGoogleTagManager({
  id: 'GTM-DEMO123',
  scriptOptions: {
    trigger: consent,
  },
  // Set default consent state BEFORE GTM loads
  onBeforeGtmStart: (gtag) => {
    gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      wait_for_update: 500,
    })
  },
})

function accept() {
  // Update consent state when user accepts
  window.gtag?.('consent', 'update', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  })
  consent.accept()
  showBanner.value = false
}

function decline() {
  showBanner.value = false
}
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="max-w-2xl mx-auto p-8">
        <h1 class="text-3xl font-bold mb-4">
          Cookie Consent Example
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
          This example shows how to use <code>useScriptTriggerConsent()</code> to defer loading scripts until the user accepts cookies.
        </p>

        <UCard>
          <template #header>
            <h2 class="font-semibold">
              How it works
            </h2>
          </template>
          <ul class="list-disc list-inside space-y-2 text-sm">
            <li>Uses Google Consent Mode v2 with default denied state</li>
            <li>GTM loads after consent with <code>onBeforeGtmStart</code> callback</li>
            <li>Consent state updates via <code>gtag('consent', 'update', ...)</code></li>
            <li>Open DevTools Network tab to see script load after accepting</li>
          </ul>
        </UCard>
      </div>

      <!-- Cookie Banner -->
      <div
        v-if="showBanner"
        class="fixed bottom-0 inset-x-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
      >
        <div class="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            We use cookies to enhance your experience. By accepting, you consent to our use of analytics cookies.
          </p>
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" @click="decline">
              Decline
            </UButton>
            <UButton @click="accept">
              Accept
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </UApp>
</template>
