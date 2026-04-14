<script lang="ts" setup>
import { useHead, useScriptStripe } from '#imports'
import { ref } from 'vue'

useHead({ title: 'Stripe - First Party' })
const { status, onLoaded } = useScriptStripe()
const result = ref('')

function createElements() {
  onLoaded(({ Stripe }: any) => {
    const stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx')
    const elements = stripe.elements()
    result.value = 'Stripe Elements created: ' + (elements ? 'success' : 'failed')
  })
}
</script>

<template>
  <div>
    <h1>Stripe First-Party Test</h1>
    <ClientOnly>
      <div id="status">
        status: {{ status }}
      </div>
    </ClientOnly>
    <div style="margin-top: 20px;">
      <button @click="createElements">
        Create Stripe Elements
      </button>
      <p v-if="result">
        {{ result }}
      </p>
    </div>
  </div>
</template>
