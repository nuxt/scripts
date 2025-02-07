<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '#imports'

useHead({
  title: 'Google Adsense',
})

const route = useRoute()
const router = useRouter()

// Get ad format from URL query, default to 'auto'
const adFormat = ref<'auto' | 'rectangle' | 'horizontal' | 'vertical' | 'fluid' | 'autorelaxed'>((route.query.format as 'auto' | 'rectangle' | 'horizontal' | 'vertical' | 'fluid' | 'autorelaxed') || 'auto')

// Function to update ad format, modify URL, and reload page
const changeAdFormat = (format: 'rectangle' | 'horizontal' | 'vertical' | 'fluid' | 'autorelaxed') => {
  if (adFormat.value !== format) {
    router.replace({ query: { format } }).then(() => {
      location.reload() // Force full page reload
    })
  }
}

// Watch URL changes and update the ad format accordingly
watch(() => route.query.format, (newFormat) => {
  if (newFormat) {
    adFormat.value = newFormat as 'auto' | 'rectangle' | 'horizontal' | 'vertical' | 'fluid' | 'autorelaxed'
  }
})
</script>

<template>
  <div class="w-full h-full space-y-4">
    <!-- Buttons to Change Ad Format (With Reload) -->
    <div class="flex gap-4 mb-4">
      <button class="px-4 py-2 bg-pink-500 text-white rounded" @click="changeAdFormat('rectangle')">
        Rectangle Ads
      </button>
      <button class="px-4 py-2 bg-blue-500 text-white rounded" @click="changeAdFormat('horizontal')">
        Horizontal Ads
      </button>
      <button class="px-4 py-2 bg-green-500 text-white rounded" @click="changeAdFormat('vertical')">
        Vertical Ads
      </button>
      <button class="px-4 py-2 bg-purple-500 text-white rounded" @click="changeAdFormat('fluid')">
        Fluid Ads
      </button>
      <button class="px-4 py-2 bg-orange-500 text-white rounded" @click="changeAdFormat('autorelaxed')">
        Native Ads
      </button>
    </div>

    <!-- Ad Section -->
    <div class="flex flex-col gap-4">
      <h4 class="text-white text-3xl">
        Selected Ad Format: {{ adFormat }}
      </h4>
      <p>
        Click a button to change the ad format. The page will reload to apply the changes.
      </p>
      <!-- data-ad-layout="in-article" -->
      <ClientOnly>
        <ScriptGoogleAdsense
          key="ad-refresh" data-ad-client="ca-pub-3940256099942544" data-ad-slot="1234567891"
          :data-ad-format="adFormat"
        >
          <template #awaitingLoad>
            <div class="text-white text-xl">
              ...waiting
            </div>
          </template>
          <template #loading>
            <div class="text-white text-xl">
              ...loading
            </div>
          </template>
        </ScriptGoogleAdsense>
      </ClientOnly>
    </div>
  </div>
</template>
