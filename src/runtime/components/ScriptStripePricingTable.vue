<script setup lang="ts">
import { ref } from 'vue'
import type { ElementScriptTrigger } from '../composables/useElementScriptTrigger'
import { onBeforeUnmount, useElementScriptTrigger, useScript } from '#imports'

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

const rootEl = ref<HTMLDivElement | undefined>()
const containerEl = ref<HTMLDivElement | undefined>()
const { $script } = useScript(`https://js.stripe.com/v3/pricing-table.js`, {
  trigger: useElementScriptTrigger({ trigger: props.trigger, el: rootEl }),
})

const pricingTable = ref<HTMLElement | undefined>()
$script.then(() => {
  const StripePricingTable = window.customElements.get('stripe-pricing-table')!
  const stripePricingTable = new StripePricingTable()
  stripePricingTable.setAttribute('publishable-key', props.publishableKey)
  stripePricingTable.setAttribute('pricing-table-id', props.pricingTableId)
  if (props.clientReferenceId)
    stripePricingTable.setAttribute('client-reference-id', props.clientReferenceId)
  if (props.customerEmail)
    stripePricingTable.setAttribute('customer-email', props.customerEmail)
  if (props.customerSessionClientSecret)
    stripePricingTable.setAttribute('customer-session-client-secret', props.customerSessionClientSecret)
  pricingTable.value = stripePricingTable
  rootEl.value!.appendChild(stripePricingTable)
  emit('ready')
})

onBeforeUnmount(() => {
  pricingTable.value?.remove()
})
</script>

<template>
  <div ref="rootEl">
    <div ref="containerEl" />
    <slot v-if="$script.status.value === 'loading'" name="loading" />
    <slot v-if="$script.status.value === 'awaitingLoad'" name="awaitingLoad" />
    <slot />
  </div>
</template>
