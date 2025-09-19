<script lang="ts" setup>
import { ref } from 'vue'
import { useScriptTriggerConsent, useScriptGoogleTagManager } from '#imports'

const showCookieBanner = ref(true)
const scriptConsent = useScriptTriggerConsent()
function acceptCookies() {
  scriptConsent.accept()
  showCookieBanner.value = false
}
useScriptGoogleTagManager({
  id: 'GTM-MWW974PF',
  scriptOptions: {
    trigger: scriptConsent,
    bundle: true,
  },
})
</script>

<template>
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
</template>
