<script setup lang="ts">
import { useScript } from '#imports'

defineProps<{
  publishableKey: string
  pricingTableId: string
  clientReferenceId?: string
  customerEmail?: string
  customerSessionClientSecret?: string
}>()

useScript(`https://js.stripe.com/v3/pricing-table.js`)
</script>

<template>
  <ClientOnly>
    <stripe-pricing-table
      v-bind="$attrs"
      :publishable-key="publishableKey"
      :pricing-table-id="pricingTableId"
      :client-reference-id="clientReferenceId"
      :customer-email="customerEmail"
      :customer-session-client-secret="customerSessionClientSecret"
    />
  </ClientOnly>
</template>
