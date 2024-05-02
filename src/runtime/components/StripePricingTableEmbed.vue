<script setup lang="ts">
import { ref } from 'vue'
import type { ElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { useElementScriptTrigger, useScript } from '#imports'

const props = defineProps<{
  trigger?: ElementScriptTrigger
  publishableKey: string
  pricingTableId: string
  clientReferenceId?: string
  customerEmail?: string
  customerSessionClientSecret?: string
}>()

const table = ref()
useScript(`https://js.stripe.com/v3/pricing-table.js`, {
  trigger: useElementScriptTrigger({ trigger: props.trigger, el: table }),
})
</script>

<template>
  <ClientOnly>
    <stripe-pricing-table
      ref="table"
      v-bind="$attrs"
      :publishable-key="publishableKey"
      :pricing-table-id="pricingTableId"
      :client-reference-id="clientReferenceId"
      :customer-email="customerEmail"
      :customer-session-client-secret="customerSessionClientSecret"
    />
  </ClientOnly>
</template>
