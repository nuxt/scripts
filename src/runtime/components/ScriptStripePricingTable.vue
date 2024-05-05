<script setup lang="ts">
import { ref } from 'vue'
import type { ElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { useElementScriptTrigger, useScript } from '#imports'

const props = withDefaults(defineProps<{
  trigger?: ElementScriptTrigger
  publishableKey: string
  pricingTableId: string
  clientReferenceId?: string
  customerEmail?: string
  customerSessionClientSecret?: string
}>(), {
  trigger: 'visible',
})

const emit = defineEmits<{
  ready: []
}>()

const rootEl = ref()
const { $script } = useScript(`https://js.stripe.com/v3/pricing-table.js`, {
  trigger: useElementScriptTrigger({ trigger: props.trigger, el: rootEl }),
})

$script.then(() => {
  emit('ready')
})
</script>

<template>
  <div ref="rootEl">
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
    <slot v-if="$script.status.value === 'loading'" name="loading" />
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
    <slot />
  </div>
</template>
