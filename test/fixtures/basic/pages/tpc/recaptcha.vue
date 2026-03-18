<script lang="ts" setup>
import { ref } from 'vue'
import { useHead, useScriptGoogleRecaptcha } from '#imports'

useHead({
  title: 'Google reCAPTCHA',
})

const SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' // test key

const { status, onLoaded } = useScriptGoogleRecaptcha({ siteKey: SITE_KEY })

const token = ref<string | null>(null)
const verified = ref<boolean | null>(null)

async function executeAndVerify() {
  onLoaded(async ({ grecaptcha }) => {
    const result = await grecaptcha.execute(SITE_KEY, { action: 'submit' })
    token.value = result

    // verify with server
    const res = await $fetch<{ success: boolean }>('/api/recaptcha-verify', {
      method: 'POST',
      body: { token: result },
    })
    verified.value = res.success
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div id="status">
        {{ status }}
      </div>
    </ClientOnly>
    <button id="execute" @click="executeAndVerify">
      Execute
    </button>
    <div v-if="token" id="token">
      {{ token }}
    </div>
    <div v-if="verified !== null" id="verified">
      {{ verified }}
    </div>
  </div>
</template>
