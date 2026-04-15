<script lang="ts" setup>
const showBanner = ref(true)

const cookiesConsent = useScriptTriggerConsent()

const { consent } = useScriptGoogleTagManager({
  id: 'GTM-DEMO123',
  defaultConsent: {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  },
  scriptOptions: { trigger: cookiesConsent },
})

function accept() {
  consent.update({
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  })
  cookiesConsent.accept()
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
          Gate GTM behind <code>useScriptTriggerConsent()</code>, set a denied default via <code>defaultConsent</code>, and flip categories with the script's own <code>consent.update()</code>.
        </p>

        <UCard>
          <template #header>
            <h2 class="font-semibold">
              How it works
            </h2>
          </template>
          <ul class="list-disc list-inside space-y-2 text-sm">
            <li><code>defaultConsent</code> pushes the GCMv2 default into the dataLayer before GTM loads</li>
            <li><code>useScriptTriggerConsent()</code> blocks the script until the user accepts</li>
            <li><code>consent.update()</code> pushes a typed GCMv2 update at runtime</li>
            <li>Open DevTools Network tab to see the script load after accepting</li>
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
