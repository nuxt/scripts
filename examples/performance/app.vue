<script lang="ts" setup>
// Performance optimization triggers demo
// Shows different ways to defer script loading

const chatSection = ref<HTMLElement>()
const mapSection = ref<HTMLElement>()

// 1. Load on first user interaction (scroll, click, keypress)
const interactionTrigger = useScriptTriggerInteraction({
  events: ['scroll', 'click', 'keydown', 'touchstart'],
})

const { status: analyticsStatus } = useScriptGoogleAnalytics({
  id: 'G-DEMO123456',
  scriptOptions: {
    trigger: interactionTrigger,
  },
})

// 2. Load when element becomes visible (intersection observer)
const visibilityTrigger = useScriptTriggerElement({
  trigger: 'visible',
  el: chatSection,
})

const { status: crispStatus } = useScriptCrisp({
  id: 'demo-crisp-id',
  scriptOptions: {
    trigger: visibilityTrigger,
  },
})

// 3. Load after idle timeout
const { status: mapsStatus } = useScript('https://maps.googleapis.com/maps/api/js?key=DEMO', {
  trigger: new Promise(resolve => setTimeout(resolve, 3000)),
})

// 4. Manual trigger
const manualTrigger = ref(false)
const manualPromise = new Promise<void>((resolve) => {
  watch(manualTrigger, (v) => {
    if (v) resolve()
  })
})

const { status: pixelStatus } = useScriptMetaPixel({
  id: '1234567890',
  scriptOptions: {
    trigger: manualPromise,
  },
})

function loadPixel() {
  manualTrigger.value = true
}

// Status color helper
function statusColor(status: string) {
  if (status === 'loaded') return 'success'
  if (status === 'loading') return 'warning'
  return 'neutral'
}
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="max-w-2xl mx-auto p-8">
        <h1 class="text-3xl font-bold mb-4">
          Performance Optimization
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
          Defer script loading with triggers to improve Core Web Vitals.
        </p>

        <div class="space-y-6">
          <!-- Interaction Trigger -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="font-semibold">
                  1. User Interaction Trigger
                </h2>
                <UBadge :color="statusColor(analyticsStatus)">
                  {{ analyticsStatus }}
                </UBadge>
              </div>
            </template>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Google Analytics loads on first scroll, click, or keypress.
            </p>
            <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded"><code>useScriptTriggerInteraction({
  events: ['scroll', 'click', 'keydown']
})</code></pre>
          </UCard>

          <!-- Delayed Trigger -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="font-semibold">
                  2. Delayed Trigger (3s)
                </h2>
                <UBadge :color="statusColor(mapsStatus)">
                  {{ mapsStatus }}
                </UBadge>
              </div>
            </template>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Maps API loads 3 seconds after page load.
            </p>
            <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded"><code>trigger: new Promise(resolve =>
  setTimeout(resolve, 3000)
)</code></pre>
          </UCard>

          <!-- Manual Trigger -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="font-semibold">
                  3. Manual Trigger
                </h2>
                <UBadge :color="statusColor(pixelStatus)">
                  {{ pixelStatus }}
                </UBadge>
              </div>
            </template>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Meta Pixel loads only when explicitly triggered.
            </p>
            <UButton :disabled="manualTrigger" @click="loadPixel">
              {{ manualTrigger ? 'Loaded' : 'Load Meta Pixel' }}
            </UButton>
          </UCard>

          <!-- Spacer for scroll demo -->
          <div class="h-[50vh] flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <p class="text-gray-400">
              Scroll down to see visibility trigger
            </p>
          </div>

          <!-- Visibility Trigger -->
          <div ref="chatSection">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h2 class="font-semibold">
                    4. Visibility Trigger
                  </h2>
                  <UBadge :color="statusColor(crispStatus)">
                    {{ crispStatus }}
                  </UBadge>
                </div>
              </template>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Crisp chat loads when this section becomes visible.
              </p>
              <pre class="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded"><code>useScriptTriggerElement({
  trigger: 'visible',
  el: chatSection,
})</code></pre>
            </UCard>
          </div>

          <!-- Summary -->
          <UCard class="mt-8">
            <template #header>
              <h2 class="font-semibold">
                Performance Impact
              </h2>
            </template>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>No scripts block initial page render</li>
              <li>LCP and FCP are not affected by third-party scripts</li>
              <li>TTI improves by deferring non-critical scripts</li>
              <li>Scripts load only when actually needed</li>
            </ul>
          </UCard>
        </div>
      </div>
    </div>
  </UApp>
</template>
