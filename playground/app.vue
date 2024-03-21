<script lang="ts" setup>
import { ref, useAnalyticsPageEvent, useScript } from '#imports'
import { scriptConsent } from '~/composables/consent'

interface GenericTrackingScript {
  track: (title: string, path: string) => void
}

const { track } = useScript<GenericTrackingScript>('https://example.com/script.js?nuxt-scripts=inline', {
  trigger: scriptConsent,
})
useAnalyticsPageEvent((payload) => {
  track(payload)
})

const showCookieBanner = ref(true)

function acceptCookies() {
  scriptConsent.accept()
  showCookieBanner.value = false
}
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <header class="sticky top-0 z-50 w-full backdrop-blur flex-none border-b border-gray-900/10 dark:border-gray-50/[0.06] bg-white/75 dark:bg-gray-900/75">
      <UContainer class="py-3">
        <div class="flex items-center justify-between">
          <NuxtLink
            to="/"
            class="flex items-center gap-1.5 font-bold text-xl text-gray-900 dark:text-white"
          >
            Nuxt
            <div class="text-primary-500 dark:text-primary-400">
              Scripts
            </div>
          </NuxtLink>
        </div>
      </UContainer>
    </header>
    <main class="min-h-full h-full flex-grow">
      <UContainer class="mt-10">
        <div class="grid grid-cols-4">
          <div class="col-span-3">
            <NuxtPage />
          </div>
        </div>
      </UContainer>
    </main>
    <div v-if="showCookieBanner" id="cookie-consent" class="p-5 bg-blue-900">
      <div class="font-bold mb-2">
        Do you accept cookies?
      </div>
      <div class="flex items-center gap-4">
        <UButton @click="acceptCookies">
          Yes
        </UButton>
        <UButton @click="showCookieBanner = false">
          No
        </UButton>
      </div>
    </div>
  </div>
</template>
