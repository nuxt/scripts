<script lang="ts" setup>
const showBanner = ref(true)
const showPreferences = ref(false)

// Separate consent triggers for each category
const analyticsConsent = useScriptTriggerConsent()
const marketingConsent = useScriptTriggerConsent()
const functionalConsent = useScriptTriggerConsent()

// Track user preferences
const preferences = reactive({
  analytics: false,
  marketing: false,
  functional: false,
})

// Analytics: Google Analytics
useScriptGoogleAnalytics({
  id: 'G-DEMO123456',
  scriptOptions: {
    trigger: analyticsConsent,
  },
})

// Marketing: Meta Pixel
useScriptMetaPixel({
  id: '1234567890',
  scriptOptions: {
    trigger: marketingConsent,
  },
})

// Functional: Crisp Chat
useScriptCrisp({
  id: 'demo-crisp-id',
  scriptOptions: {
    trigger: functionalConsent,
  },
})

function acceptAll() {
  preferences.analytics = true
  preferences.marketing = true
  preferences.functional = true
  analyticsConsent.accept()
  marketingConsent.accept()
  functionalConsent.accept()
  showBanner.value = false
}

function declineAll() {
  showBanner.value = false
}

function savePreferences() {
  if (preferences.analytics) analyticsConsent.accept()
  if (preferences.marketing) marketingConsent.accept()
  if (preferences.functional) functionalConsent.accept()
  showPreferences.value = false
  showBanner.value = false
}
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="max-w-2xl mx-auto p-8">
        <h1 class="text-3xl font-bold mb-4">
          Granular Consent Example
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
          This example shows per-category consent with separate triggers for analytics, marketing, and functional scripts.
        </p>

        <div class="space-y-4">
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-chart-bar" />
                <span class="font-semibold">Analytics (Google Analytics)</span>
              </div>
            </template>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Status: {{ preferences.analytics ? 'Consented' : 'Pending consent' }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-megaphone" />
                <span class="font-semibold">Marketing (Meta Pixel)</span>
              </div>
            </template>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Status: {{ preferences.marketing ? 'Consented' : 'Pending consent' }}
            </p>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-chat-bubble-left-right" />
                <span class="font-semibold">Functional (Crisp Chat)</span>
              </div>
            </template>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Status: {{ preferences.functional ? 'Consented' : 'Pending consent' }}
            </p>
          </UCard>
        </div>
      </div>

      <!-- Cookie Banner -->
      <div
        v-if="showBanner"
        class="fixed bottom-0 inset-x-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg"
      >
        <div class="max-w-4xl mx-auto">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            We use cookies to enhance your experience. Choose which categories you'd like to enable.
          </p>
          <div class="flex flex-wrap gap-2">
            <UButton color="neutral" variant="outline" @click="declineAll">
              Decline All
            </UButton>
            <UButton color="neutral" variant="soft" @click="showPreferences = true">
              Customize
            </UButton>
            <UButton @click="acceptAll">
              Accept All
            </UButton>
          </div>
        </div>
      </div>

      <!-- Preferences Modal -->
      <UModal v-model:open="showPreferences">
        <template #content>
          <UCard>
            <template #header>
              <h3 class="font-semibold text-lg">
                Cookie Preferences
              </h3>
            </template>

            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">
                    Analytics
                  </p>
                  <p class="text-sm text-gray-500">
                    Help us understand how you use our site
                  </p>
                </div>
                <USwitch v-model="preferences.analytics" />
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">
                    Marketing
                  </p>
                  <p class="text-sm text-gray-500">
                    Personalized ads and retargeting
                  </p>
                </div>
                <USwitch v-model="preferences.marketing" />
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">
                    Functional
                  </p>
                  <p class="text-sm text-gray-500">
                    Live chat and support features
                  </p>
                </div>
                <USwitch v-model="preferences.functional" />
              </div>
            </div>

            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton color="neutral" variant="ghost" @click="showPreferences = false">
                  Cancel
                </UButton>
                <UButton @click="savePreferences">
                  Save Preferences
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </div>
  </UApp>
</template>
