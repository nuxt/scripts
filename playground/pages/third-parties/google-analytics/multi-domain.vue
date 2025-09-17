<script lang="ts" setup>
import { useHead, useScriptGoogleAnalytics } from '#imports'

useHead({
  title: 'Google Analytics - Multi-Domain Setup',
})

// Simulate locale detection (in real app, would use @nuxtjs/i18n)
const currentLocale = ref('en')
const currentDomain = ref('example.com')

// Example 1: Locale-based Analytics ID
const analyticsIds = {
  en: 'G-ENGLISH123',
  es: 'G-SPANISH456',
  fr: 'G-FRENCH789',
}

const { gtag: localeGtag, status: localeStatus } = useScriptGoogleAnalytics({
  key: 'locale-analytics',
  id: computed(() => analyticsIds[currentLocale.value] || analyticsIds['en']),
})

// Example 2: Domain-based Analytics ID
const domainToId = {
  'example.com': 'G-MAIN123',
  'example.co.uk': 'G-UK456',
  'example.fr': 'G-FR789',
}

const { gtag: domainGtag, status: domainStatus } = useScriptGoogleAnalytics({
  key: 'domain-analytics',
  id: computed(() => domainToId[currentDomain.value] || domainToId['example.com']),
})

// Example usage functions
function switchLocale(locale: string) {
  currentLocale.value = locale
  // Send locale change event
  localeGtag('event', 'locale_change', {
    new_locale: locale,
    previous_locale: currentLocale.value,
  })
}

function switchDomain(domain: string) {
  currentDomain.value = domain
  // Send domain change event (simulated)
  domainGtag('event', 'domain_view', {
    domain: domain,
    market: getMarketFromDomain(domain),
  })
}

function getMarketFromDomain(domain: string): string {
  const domainToMarket = {
    'example.com': 'US',
    'example.co.uk': 'UK',
    'example.fr': 'FR',
  }
  return domainToMarket[domain] || 'Global'
}

function trackPurchase() {
  const event = {
    value: 99.99,
    currency: currentLocale.value === 'fr' ? 'EUR' : 'USD',
    custom_locale: currentLocale.value,
    custom_market: getMarketFromDomain(currentDomain.value),
  }

  localeGtag('event', 'purchase', event)
  domainGtag('event', 'purchase', event)
}
</script>

<template>
  <div class="p-4 space-y-6">
    <h1 class="text-2xl font-bold">
      Multi-Domain & i18n Google Analytics
    </h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Locale-based Analytics -->
      <div class="border rounded-lg p-4">
        <h2 class="text-lg font-semibold mb-3">
          Locale-based Analytics
        </h2>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">Current Locale:</label>
            <select v-model="currentLocale" class="border rounded px-2 py-1">
              <option value="en">
                English
              </option>
              <option value="es">
                Spanish
              </option>
              <option value="fr">
                French
              </option>
            </select>
          </div>
          <div>
            <span class="text-sm">Analytics ID: {{ analyticsIds[currentLocale] }}</span>
          </div>
          <ClientOnly>
            <div class="text-sm">
              Status: <span :class="localeStatus === 'loaded' ? 'text-green-600' : 'text-yellow-600'">
                {{ localeStatus }}
              </span>
            </div>
          </ClientOnly>
          <button
            class="bg-blue-500 text-white px-3 py-1 rounded text-sm"
            @click="switchLocale(currentLocale)"
          >
            Send Locale Event
          </button>
        </div>
      </div>

      <!-- Domain-based Analytics -->
      <div class="border rounded-lg p-4">
        <h2 class="text-lg font-semibold mb-3">
          Domain-based Analytics
        </h2>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">Current Domain:</label>
            <select v-model="currentDomain" class="border rounded px-2 py-1">
              <option value="example.com">
                example.com (US)
              </option>
              <option value="example.co.uk">
                example.co.uk (UK)
              </option>
              <option value="example.fr">
                example.fr (FR)
              </option>
            </select>
          </div>
          <div>
            <span class="text-sm">Analytics ID: {{ domainToId[currentDomain] }}</span>
          </div>
          <ClientOnly>
            <div class="text-sm">
              Status: <span :class="domainStatus === 'loaded' ? 'text-green-600' : 'text-yellow-600'">
                {{ domainStatus }}
              </span>
            </div>
          </ClientOnly>
          <button
            class="bg-green-500 text-white px-3 py-1 rounded text-sm"
            @click="switchDomain(currentDomain)"
          >
            Send Domain Event
          </button>
        </div>
      </div>
    </div>

    <!-- Combined Actions -->
    <div class="border rounded-lg p-4">
      <h2 class="text-lg font-semibold mb-3">
        Combined Tracking
      </h2>
      <p class="text-sm text-gray-600 mb-3">
        This will send events to both locale-based and domain-based analytics
      </p>
      <button
        class="bg-purple-500 text-white px-4 py-2 rounded"
        @click="trackPurchase"
      >
        Track Purchase Event
      </button>
    </div>

    <!-- Code Example -->
    <div class="border rounded-lg p-4 bg-gray-50">
      <h3 class="text-md font-semibold mb-2">
        Code Implementation
      </h3>
      <pre class="text-xs overflow-x-auto"><code>// Locale-based setup
const analyticsIds = {
  'en': 'G-ENGLISH123',
  'es': 'G-SPANISH456',
  'fr': 'G-FRENCH789'
}

const { gtag } = useScriptGoogleAnalytics({
  key: 'locale-analytics',
  id: computed(() => analyticsIds[locale.value])
})

// Track with locale context
gtag('event', 'purchase', {
  value: 99.99,
  currency: 'USD',
  custom_locale: locale.value
})</code></pre>
    </div>
  </div>
</template>
