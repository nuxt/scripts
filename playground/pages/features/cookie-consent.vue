<script lang="ts" setup>
import { ref } from 'vue'
import { useScriptGoogleTagManager, useScriptTriggerConsent } from '#imports'

const showCookieBanner = ref(true)
const triggerConsent = useScriptTriggerConsent()

const { consent } = useScriptGoogleTagManager({
  id: 'GTM-MWW974PF',
  defaultConsent: {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  },
  scriptOptions: {
    trigger: triggerConsent,
    bundle: true,
  },
})

function acceptCookies() {
  consent.update({
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  })
  triggerConsent.accept()
  showCookieBanner.value = false
}
function revokeCookies() {
  consent.update({
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  })
  triggerConsent.revoke()
  showCookieBanner.value = true
}
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
        Cookie Status: {{ triggerConsent.consented.value ? 'Accepted' : 'Declined' }}
      </div>
      <UButton v-if="triggerConsent.consented.value" color="red" @click="revokeCookies">
        Revoke Consent
      </UButton>
      <UButton v-else color="green" @click="acceptCookies">
        Accept Cookies
      </UButton>
    </div>
  </div>
</template>
