<script lang="ts" setup>
import { ref } from 'vue'
import { useHead, useScriptGoogleRecaptcha } from '#imports'

useHead({
  title: 'Google reCAPTCHA',
})

const SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' // test key

const { status, onLoaded } = useScriptGoogleRecaptcha({ siteKey: SITE_KEY })

const token = ref<string | null>(null)
const verification = ref<{ success: boolean, score?: number, action?: string, errors?: string[] } | null>(null)
const loading = ref(false)

async function executeAndVerify() {
  loading.value = true
  token.value = null
  verification.value = null

  onLoaded(async ({ grecaptcha }) => {
    const result = await grecaptcha.execute(SITE_KEY, { action: 'submit' })
    token.value = result

    // verify on server
    verification.value = await $fetch('/api/recaptcha-verify', {
      method: 'POST',
      body: { token: result },
    })
    loading.value = false
  })
}
</script>

<template>
  <div>
    <ClientOnly>
      <div>
        Script status: <strong>{{ status }}</strong>
      </div>
      <div class="mt-4">
        <UButton :loading="loading" @click="executeAndVerify">
          Execute & Verify reCAPTCHA
        </UButton>
      </div>
      <div v-if="token" class="mt-4">
        <p class="text-sm text-gray-500">
          Token: {{ token.slice(0, 50) }}...
        </p>
      </div>
      <div v-if="verification" class="mt-4 p-4 rounded" :class="verification.success ? 'bg-green-100' : 'bg-red-100'">
        <p><strong>Verification:</strong> {{ verification.success ? '✅ Passed' : '❌ Failed' }}</p>
        <p v-if="verification.score !== undefined">
          Score: {{ verification.score }}
        </p>
        <p v-if="verification.action">
          Action: {{ verification.action }}
        </p>
        <p v-if="verification.errors?.length">
          Errors: {{ verification.errors.join(', ') }}
        </p>
      </div>
    </ClientOnly>
  </div>
</template>
