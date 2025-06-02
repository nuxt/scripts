<script lang="ts" setup>
import { ref } from 'vue'
import { useScriptTriggerConsent, useScriptGoogleTagManager } from '#imports'

const showCookieBanner = ref(true)
const scriptConsent = useScriptTriggerConsent()
function acceptCookies() {
  scriptConsent.accept()
  showCookieBanner.value = false
}
function revokeCookies() {
  scriptConsent.revoke()
  showCookieBanner.value = true
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
  <div>
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
    <div v-else class="p-5 bg-gray-100">
      <div class="font-bold mb-2">
        Cookie Status: {{ scriptConsent.consented.value ? 'Accepted' : 'Declined' }}
      </div>
      <UButton v-if="scriptConsent.consented.value" color="red" @click="revokeCookies">
        Revoke Consent
      </UButton>
      <UButton v-else color="green" @click="acceptCookies">
        Accept Cookies
      </UButton>
    </div>
  </div>
</template>
