<script lang="ts" setup>
import { useHead, useScriptPayPal } from '#imports'
import { ref } from 'vue'

useHead({ title: 'PayPal - First Party' })
const { status, onLoaded } = useScriptPayPal({ clientId: 'test', sandbox: true })
const result = ref('')

function checkSDK() {
  onLoaded(({ paypal }: any) => {
    result.value = paypal ? 'PayPal SDK loaded, Buttons available: ' + !!paypal.Buttons : 'SDK not available'
  })
}
</script>

<template>
  <div>
    <h1>PayPal First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="checkSDK">
        Check PayPal SDK
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>
