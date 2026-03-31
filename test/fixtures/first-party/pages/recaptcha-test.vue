<script lang="ts" setup>
import { useHead, useScriptGoogleRecaptcha } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Google reCAPTCHA - First Party' })
const { status, proxy } = useScriptGoogleRecaptcha({ siteKey: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' })
const result = ref('')

function executeRecaptcha() {
  proxy.grecaptcha.ready(() => {
    proxy.grecaptcha.execute('6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI', { action: 'test' }).then((token: string) => {
      result.value = 'Token: ' + token.slice(0, 20) + '...'
    })
  })
}
</script>

<template>
  <div>
    <h1>Google reCAPTCHA First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="executeRecaptcha">
        Execute reCAPTCHA
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>
