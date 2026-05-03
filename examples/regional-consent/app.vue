<script lang="ts" setup>
useScriptGoogleTagManager({
  id: 'GTM-DEMO123',
  defaultConsent: [
    {
      // EEA + UK + Switzerland — denied by default, gtag waits 500ms for an update.
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      region: ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI', 'NO', 'CH'],
      wait_for_update: 500,
    },
    {
      // Unscoped fallback — everywhere else, granted by default.
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    },
  ],
})
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="max-w-2xl mx-auto p-8">
        <h1 class="text-3xl font-bold mb-4">
          Region-specific Consent Mode example
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
          Pass an array to <code>defaultConsent</code> to fire multiple
          <code>['consent','default', state]</code> pushes — one per region group.
          gtag picks the most specific region match at runtime.
        </p>

        <UCard>
          <template #header>
            <h2 class="font-semibold">
              How it works
            </h2>
          </template>
          <ul class="list-disc list-inside space-y-2 text-sm">
            <li>The first entry targets the EEA + UK + Switzerland via <code>region</code> and starts denied</li>
            <li>The second entry has no <code>region</code> and is the unscoped global fallback (granted)</li>
            <li>Order in the array does not matter — Google's "more specific region wins" rule is enforced by gtag at runtime</li>
            <li>Open DevTools → Network &amp; <code>window.dataLayer</code> to see two consent-default pushes before <code>gtm.js</code></li>
          </ul>
        </UCard>
      </div>
    </div>
  </UApp>
</template>
