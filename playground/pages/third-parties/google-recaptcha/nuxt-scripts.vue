<script lang="ts" setup>
import { ref } from 'vue'
import { useHead, useScriptGoogleRecaptcha } from '#imports'

useHead({
  title: 'Google reCAPTCHA',
})

const { status, onLoaded } = useScriptGoogleRecaptcha({
  siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', // test key
})

const token = ref<string | null>(null)

async function executeRecaptcha() {
  onLoaded(async ({ grecaptcha }) => {
    const result = await grecaptcha.execute('6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', { action: 'submit' })
    token.value = result
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        status: {{ status }}
      </div>
      <div class="mt-4">
        <UButton @click="executeRecaptcha">
          Execute reCAPTCHA
        </UButton>
      </div>
      <div v-if="token" class="mt-4">
        <p class="text-sm text-gray-500">
          Token: {{ token.slice(0, 50) }}...
        </p>
      </div>
    </ClientOnly>
  </div>
</template>
