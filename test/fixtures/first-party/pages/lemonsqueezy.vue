<script lang="ts" setup>
import { useHead, useScriptLemonSqueezy } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Lemon Squeezy - First Party' })
const { status, proxy } = useScriptLemonSqueezy()
const result = ref('')

function openCheckout() {
  proxy.LemonSqueezy.Url.Open('https://store.supersaas.dev/buy/ed9818ff-506d-4378-991c-081e1ecd8087?embed=1')
  result.value = 'Checkout overlay opened'
}

function refresh() {
  proxy.LemonSqueezy.Refresh()
  result.value = 'Button listeners refreshed'
}
</script>

<template>
  <div>
    <h1>Lemon Squeezy First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="openCheckout">
        Open Checkout Overlay
      </button>
      <button @click="refresh">
        Refresh Listeners
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>
